<template>
	<div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Community</h1>
			<Button v-if="user?.data" @click="showNewPostDialog = true" variant="solid">
				New Post
			</Button>
		</div>

		<div class="space-y-4">
			<Card v-for="post in posts" :key="post.name" class="hover:shadow-md transition-shadow">
				<div class="flex">
					<!-- Voting sidebar -->
					<div class="bg-gray-50 flex flex-col items-center justify-start p-4 rounded-l-lg border-r border-gray-100 min-w-[60px]">
						<button 
							@click.stop="vote(post, 'Upvote')" 
							class="text-gray-400 hover:text-green-500 transition-colors"
						>
							<ChevronUp class="w-6 h-6" />
						</button>
						<span class="font-bold text-gray-700 my-1">{{ post.upvotes }}</span>
						<button 
							@click.stop="vote(post, 'Downvote')" 
							class="text-gray-400 hover:text-red-500 transition-colors"
						>
							<ChevronDown class="w-6 h-6" />
						</button>
					</div>

					<!-- Post Content -->
					<div class="p-4 flex-1 cursor-pointer" @click="goToPost(post.name)">
						<h2 class="text-xl font-semibold text-gray-900 mb-1">{{ post.title }}</h2>
						<div class="text-sm text-gray-500 mb-3">
							Posted by <span class="font-medium text-gray-700">{{ post.author }}</span> 
							• {{ timeAgo(post.creation) }}
						</div>
						
						<!-- Preview content -->
						<div class="text-gray-600 line-clamp-2 prose prose-sm max-w-none mb-4" v-html="previewContent(post.content)"></div>
						
						<div class="flex items-center text-sm text-gray-500">
							<MessageSquare class="w-4 h-4 mr-1.5" />
							{{ post.comment_count }} {{ post.comment_count === 1 ? 'Comment' : 'Comments' }}
						</div>
					</div>
				</div>
			</Card>

			<div v-if="posts.length === 0 && !loading" class="text-center py-12 text-gray-500">
				<MessageCircle class="w-12 h-12 mx-auto mb-4 text-gray-300" />
				<h3 class="text-lg font-medium text-gray-900">No posts yet</h3>
				<p class="mt-1">Be the first to start a discussion!</p>
			</div>
			
			<div v-if="loading" class="flex justify-center py-12">
				<LoadingIndicator class="w-8 h-8 text-primary" />
			</div>
		</div>

		<!-- New Post Dialog -->
		<Dialog v-model="showNewPostDialog" title="Create New Post" :options="{ size: 'xl' }">
			<template #body-content>
				<div class="space-y-4 my-2">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
						<FormControl v-model="newPost.title" type="text" placeholder="What's on your mind?" class="w-full" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Content</label>
						<TextEditor 
							v-if="showNewPostDialog" 
							ref="editor" 
							:content="newPost.content"
							@change="(val) => newPost.content = val"
							class="min-h-[200px]"
						/>
					</div>
				</div>
			</template>
			<template #actions>
				<div class="flex justify-end space-x-2 w-full">
					<Button @click="showNewPostDialog = false">Cancel</Button>
					<Button variant="solid" @click="submitPost" :loading="submitting">Post</Button>
				</div>
			</template>
		</Dialog>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronUp, ChevronDown, MessageSquare, MessageCircle } from 'lucide-vue-next'
import { Card, Button, FormControl, Dialog, LoadingIndicator, TextEditor, toast } from 'frappe-ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { usersStore } from '@/stores/user'

dayjs.extend(relativeTime)

const router = useRouter()
const { userResource: user } = usersStore()
const posts = ref([])
const loading = ref(true)
const showNewPostDialog = ref(false)
const submitting = ref(false)
const editor = ref(null)

const newPost = ref({
	title: '',
	content: '' // Actually it's editor content as json internally
})

onMounted(() => {
	fetchPosts()
})

const fetchPosts = async () => {
	loading.value = true
	try {
        const res = await fetch('/api/method/lms.lms.api.community.get_posts')
        const data = await res.json()
        posts.value = data.message || []
	} catch (error) {
		console.error("Failed to fetch posts", error)
	} finally {
		loading.value = false
	}
}

const goToPost = (postName) => {
	router.push({ name: 'PostDetail', params: { postName } })
}

const timeAgo = (dateStr) => {
	return dayjs(dateStr).fromNow()
}

const previewContent = (content) => {
    // Basic extraction of text from editorjs content array
    if (!content) return ''
    try {
        const parsed = JSON.parse(content)
        if (parsed.blocks && parsed.blocks.length > 0) {
            return parsed.blocks.map(b => b.data.text || '').join(' ')
        }
    } catch (e) {
        return content
    }
    return ''
}

const vote = async (post, type) => {
	if (!user.data) {
		toast.info('Please log in to vote')
		return
	}
	
	try {
        // Implement immediate optimistic UI update
        // We do a true refetch on post detail instead
        const currentVote = null // simplified for feed
        const formData = new FormData()
        formData.append('reference_doctype', 'LMS Community Post')
        formData.append('reference_name', post.name)
        formData.append('vote_type', type)
        
        const res = await fetch('/api/method/lms.lms.api.community.vote', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Frappe-CSRF-Token': window.csrf_token
            }
        })
        const data = await res.json()
        if (data.message !== undefined) {
            post.upvotes = data.message
        }
	} catch (error) {
		console.error("Vote failed", error)
	}
}

const submitPost = async () => {
    if (!newPost.value.title.trim()) {
        toast.error('Title is required')
        return
    }
    
    // Attempt to get Editor blocks
    let contentJson = ''
    if (editor.value && editor.value.editor) {
        const outputData = await editor.value.editor.save()
        contentJson = JSON.stringify(outputData)
    }

	submitting.value = true
	try {
        const formData = new FormData()
        formData.append('title', newPost.value.title)
        formData.append('content', contentJson)
        
        const res = await fetch('/api/method/lms.lms.api.community.create_post', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Frappe-CSRF-Token': window.csrf_token
            }
        })
        
        const data = await res.json()
        if (data.message) {
            toast.success('Post created successfully')
            showNewPostDialog.value = false
            newPost.value.title = ''
            newPost.value.content = ''
            fetchPosts()
        } else {
            throw new Error(data.exc || 'Failed to create post')
        }
	} catch (error) {
		toast.error(error.message || 'Error creating post')
		console.error(error)
	} finally {
		submitting.value = false
	}
}
</script>
