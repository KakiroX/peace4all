import type { Subject } from "@/lib/types";

// IB Business Management SL (first assessment 2024). HL-only sub-topics are excluded.
const bmSL: Subject = {
  id: "bm-sl",
  name: "Business Management SL",
  shortName: "Business",
  level: "SL",
  colorSlot: 4,
  numericTolerance: 0.01,
  papers: [
    { id: "P1", name: "Paper 1", description: "Pre-released statement case study" },
    { id: "P2", name: "Paper 2", description: "Quantitative structured questions" },
  ],
  units: [
    { id: "1", name: "Introduction to business management" },
    { id: "2", name: "Human resource management" },
    { id: "3", name: "Finance and accounts" },
    { id: "4", name: "Marketing" },
    { id: "5", name: "Operations management" },
  ],
  topics: [
    { id: "1.1", unit: "1", code: "1.1", name: "Introduction to business management", covers: ["sectors", "entrepreneurship"] },
    { id: "1.2", unit: "1", code: "1.2", name: "Types of business entities", covers: ["sole traders", "partnerships", "companies", "social enterprises"] },
    { id: "1.3", unit: "1", code: "1.3", name: "Business objectives", covers: ["vision/mission", "SWOT", "CSR"] },
    { id: "1.4", unit: "1", code: "1.4", name: "Stakeholders", covers: ["internal/external", "stakeholder conflict"] },
    { id: "1.5", unit: "1", code: "1.5", name: "Growth and evolution", covers: ["economies of scale", "internal/external growth"] },
    { id: "1.6", unit: "1", code: "1.6", name: "Multinational companies (MNCs)", covers: ["impact on host countries"] },
    { id: "2.1", unit: "2", code: "2.1", name: "Introduction to human resource management", covers: ["workforce planning", "recruitment", "training"] },
    { id: "2.2", unit: "2", code: "2.2", name: "Organizational structure", covers: ["hierarchy", "span of control", "delegation"] },
    { id: "2.3", unit: "2", code: "2.3", name: "Leadership and management", covers: ["leadership styles"] },
    { id: "2.4", unit: "2", code: "2.4", name: "Motivation and demotivation", covers: ["Taylor", "Maslow", "Herzberg", "financial rewards"] },
    { id: "2.6", unit: "2", code: "2.6", name: "Communication", covers: ["formal/informal", "barriers"] },
    { id: "3.1", unit: "3", code: "3.1", name: "Introduction to finance", covers: ["capital vs revenue expenditure"] },
    { id: "3.2", unit: "3", code: "3.2", name: "Sources of finance", covers: ["internal", "external", "short vs long term"] },
    { id: "3.3", unit: "3", code: "3.3", name: "Costs and revenues", covers: ["fixed/variable", "revenue streams"] },
    { id: "3.4", unit: "3", code: "3.4", name: "Final accounts", covers: ["P&L", "balance sheet", "depreciation"] },
    { id: "3.5", unit: "3", code: "3.5", name: "Profitability and liquidity ratio analysis", covers: ["GPM", "PM", "ROCE", "current/acid-test ratio"] },
    { id: "3.7", unit: "3", code: "3.7", name: "Cash flow", covers: ["cash flow forecasts", "working capital"] },
    { id: "3.8", unit: "3", code: "3.8", name: "Investment appraisal", covers: ["payback period", "ARR"] },
    { id: "4.1", unit: "4", code: "4.1", name: "Introduction to marketing", covers: ["market share", "market orientation"] },
    { id: "4.2", unit: "4", code: "4.2", name: "Marketing planning", covers: ["segmentation", "positioning", "USP"] },
    { id: "4.4", unit: "4", code: "4.4", name: "Market research", covers: ["primary/secondary", "sampling"] },
    { id: "4.5", unit: "4", code: "4.5", name: "The seven Ps of the marketing mix", covers: ["product", "price", "promotion", "place", "people", "process", "physical evidence"] },
    { id: "5.1", unit: "5", code: "5.1", name: "Introduction to operations management", covers: ["operations and sustainability"] },
    { id: "5.2", unit: "5", code: "5.2", name: "Operations methods", covers: ["job", "batch", "mass/flow", "cellular"] },
    { id: "5.4", unit: "5", code: "5.4", name: "Location", covers: ["location factors", "outsourcing", "offshoring"] },
    { id: "5.5", unit: "5", code: "5.5", name: "Break-even analysis", covers: ["contribution", "break-even", "margin of safety"] },
  ],
};

export default bmSL;
