<template>
	<div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
		<Button 
			variant="ghost" 
			@click="router.push({ name: 'Community' })" 
			class="mb-6 flex items-center text-gray-500 hover:text-gray-900"
		>
			<ArrowLeft class="w-4 h-4 mr-2" />
			Back to Community
		</Button>

		<div v-if="loading" class="flex justify-center py-12">
			<LoadingIndicator class="w-8 h-8 text-primary" />
		</div>

		<div v-else-if="post">
			<!-- Original Post -->
			<Card class="mb-8 border-l-4 border-l-primary shadow-sm">
				<div class="flex">
					<!-- Voting sidebar -->
					<div class="bg-gray-50 flex flex-col items-center justify-start p-4 rounded-l-lg border-r border-gray-100 min-w-[60px]">
						<button 
							@click.stop="vote(post, 'LMS Community Post', 'Upvote')" 
							class="text-gray-400 hover:text-green-500 transition-colors"
							:class="{'text-green-600': post.user_vote === 'Upvote'}"
						>
							<ChevronUp class="w-7 h-7" />
						</button>
						<span class="font-bold text-gray-800 my-1 text-lg">{{ post.upvotes }}</span>
						<button 
							@click.stop="vote(post, 'LMS Community Post', 'Downvote')" 
							class="text-gray-400 hover:text-red-500 transition-colors"
							:class="{'text-red-600': post.user_vote === 'Downvote'}"
						>
							<ChevronDown class="w-7 h-7" />
						</button>
					</div>

					<div class="p-6 flex-1">
						<h1 class="text-2xl font-bold text-gray-900 mb-2">{{ post.title }}</h1>
						<div class="text-sm text-gray-500 mb-6 flex items-center">
							<User class="w-4 h-4 mr-1.5" />
							<span class="font-medium text-gray-700 mr-2">{{ post.author }}</span> 
							<Clock class="w-4 h-4 mr-1.5" />
							{{ timeAgo(post.creation) }}
						</div>
						
						<!-- Post content inside TextEditor in read_only mode -->
						<div class="prose max-w-none text-gray-800">
							<TextEditor 
								:content="post.content"
								:read_only="true"
							/>
						</div>
					</div>
				</div>
			</Card>

			<!-- Comments Section -->
			<h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
				<MessageSquare class="w-5 h-5 mr-2 text-gray-600" />
				{{ post.comments.length }} {{ post.comments.length === 1 ? 'Comment' : 'Comments' }}
			</h3>

			<!-- Add Comment -->
			<Card class="mb-8 bg-gray-50">
				<div class="p-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">Leave a comment</h4>
					<div v-if="!user.data" class="text-sm text-gray-500 mb-3 bg-white p-3 rounded border">
						Please <a href="/login" class="text-primary hover:underline">log in</a> to leave a comment.
					</div>
					<div v-else>
						<TextEditor 
							ref="commentEditor" 
							:content="newComment"
							@change="(val) => newComment = val"
							class="bg-white min-h-[120px] mb-3 border rounded shadow-sm focus-within:ring-2 focus-within:ring-primary/20"
						/>
						<div class="flex justify-end">
							<Button variant="solid" @click="submitComment" :loading="submittingComment">
								Post Comment
							</Button>
						</div>
					</div>
				</div>
			</Card>

			<!-- Comment Thread -->
			<div class="space-y-4 pt-2">
				<Card v-for="comment in post.comments" :key="comment.name" class="border shadow-none">
					<div class="flex">
						<!-- Comment Voting sidebar -->
						<div class="bg-gray-50 flex flex-col items-center justify-start p-3 py-4 rounded-l-lg border-r border-gray-100 min-w-[50px]">
							<button 
								@click.stop="vote(comment, 'LMS Community Comment', 'Upvote')" 
								class="text-gray-400 hover:text-green-500 transition-colors"
								:class="{'text-green-600': comment.user_vote === 'Upvote'}"
							>
								<ChevronUp class="w-5 h-5" />
							</button>
							<span class="font-bold text-gray-700 my-0.5 text-sm">{{ comment.upvotes }}</span>
							<button 
								@click.stop="vote(comment, 'LMS Community Comment', 'Downvote')" 
								class="text-gray-400 hover:text-red-500 transition-colors"
								:class="{'text-red-600': comment.user_vote === 'Downvote'}"
							>
								<ChevronDown class="w-5 h-5" />
							</button>
						</div>

						<div class="p-4 flex-1">
							<div class="flex items-center justify-between mb-2">
								<div class="text-sm text-gray-500">
									<span class="font-medium text-gray-800">{{ comment.author }}</span> 
									<span class="mx-1">•</span>
									{{ timeAgo(comment.creation) }}
								</div>
							</div>
							
							<div class="prose prose-sm max-w-none text-gray-700">
								<TextEditor 
									:content="comment.content"
									:read_only="true"
								/>
							</div>
						</div>
					</div>
				</Card>
			</div>
		</div>

		<div v-else class="text-center py-16">
			<h2 class="text-2xl font-bold text-gray-900 mb-2">Post not found</h2>
			<p class="text-gray-500 mb-6">The post you are looking for does not exist or has been removed.</p>
			<Button variant="solid" @click="router.push({ name: 'Community' })">
				Return to Community
			</Button>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronUp, ChevronDown, MessageSquare, ArrowLeft, User, Clock } from 'lucide-vue-next'
import { Card, Button, LoadingIndicator, TextEditor, toast } from 'frappe-ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { usersStore } from '@/stores/user'

dayjs.extend(relativeTime)

const route = useRoute()
const router = useRouter()
const { userResource: user } = usersStore()

const postName = route.params.postName
const post = ref(null)
const loading = ref(true)
const submittingComment = ref(false)
const newComment = ref('')
const commentEditor = ref(null)

onMounted(() => {
	fetchPostDetails()
})

const fetchPostDetails = async () => {
	loading.value = true
	try {
        const res = await fetch(`/api/method/lms.lms.api.community.get_post?post_name=${encodeURIComponent(postName)}`)
        const data = await res.json()
        if (data.message) {
            post.value = data.message
        }
	} catch (error) {
		console.error("Failed to fetch post details", error)
	} finally {
		loading.value = false
	}
}

const timeAgo = (dateStr) => {
	return dayjs(dateStr).fromNow()
}

const submitComment = async () => {
    let contentJson = ''
    if (commentEditor.value && commentEditor.value.editor) {
        const outputData = await commentEditor.value.editor.save()
        contentJson = JSON.stringify(outputData)
    }

    if (!contentJson || contentJson === '{"time":1,"blocks":[],"version":"2.29.0"}') {
        toast.error('Comment cannot be empty')
        return
    }

	submittingComment.value = true
	try {
        const formData = new FormData()
        formData.append('post_name', post.value.name)
        formData.append('content', contentJson)
        
        const res = await fetch('/api/method/lms.lms.api.community.create_comment', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Frappe-CSRF-Token': window.csrf_token
            }
        })
        
        const data = await res.json()
        if (data.message) {
            toast.success('Comment posted successfully')
            newComment.value = ''
            // Refetch post to get new comment
            fetchPostDetails()
        } else {
            throw new Error(data.exc || 'Failed to post comment')
        }
	} catch (error) {
		toast.error(error.message || 'Error posting comment')
		console.error(error)
	} finally {
		submittingComment.value = false
	}
}

const vote = async (item, doctype, type) => {
	if (!user.data) {
		toast.info('Please log in to vote')
		return
	}
	
    // Optimistic UI updates
    const previousVote = item.user_vote
    let voteTypeToSend = type

    if (previousVote === type) {
        voteTypeToSend = 'None' // Clicking the same vote removes it
        item.user_vote = null
        item.upvotes += type === 'Upvote' ? -1 : 1
    } else {
        item.user_vote = type
        if (type === 'Upvote') {
            item.upvotes += previousVote === 'Downvote' ? 2 : 1
        } else {
            item.upvotes -= previousVote === 'Upvote' ? 2 : 1
        }
    }

	try {
        const formData = new FormData()
        formData.append('reference_doctype', doctype)
        formData.append('reference_name', item.name)
        formData.append('vote_type', voteTypeToSend)
        
        const res = await fetch('/api/method/lms.lms.api.community.vote', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Frappe-CSRF-Token': window.csrf_token
            }
        })
        const data = await res.json()
        if (data.message !== undefined) {
            // sync with server true value
            item.upvotes = data.message
        }
	} catch (error) {
		console.error("Vote failed", error)
        // Revert optimistic update
        item.user_vote = previousVote
	}
}
</script>
