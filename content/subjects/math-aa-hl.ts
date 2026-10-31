import type { Subject } from "@/lib/types";

// IB Mathematics: Analysis and Approaches HL. The five syllabus topics are split
// into finer "skill clusters" so weak spots are specific enough to act on.
const mathAAHL: Subject = {
  id: "math-aa-hl",
  name: "Math AA HL",
  shortName: "Math AA",
  level: "HL",
  colorSlot: 2,
  numericTolerance: 0.005,
  papers: [
    { id: "P1", name: "Paper 1", description: "No calculator, short + extended response" },
    { id: "P2", name: "Paper 2", description: "Calculator, short + extended response" },
    { id: "P3", name: "Paper 3", description: "Calculator, extended problem-solving (HL)" },
  ],
  units: [
    { id: "1", name: "Number and algebra" },
    { id: "2", name: "Functions" },
    { id: "3", name: "Geometry and trigonometry" },
    { id: "4", name: "Statistics and probability" },
    { id: "5", name: "Calculus" },
  ],
  topics: [
    { id: "num-seq", unit: "1", code: "1.1", name: "Sequences and series", covers: ["arithmetic", "geometric", "sigma notation", "financial apps"] },
    { id: "num-explog", unit: "1", code: "1.2", name: "Exponents and logarithms", covers: ["laws of logs", "change of base", "exponential equations"] },
    { id: "num-binom", unit: "1", code: "1.3", name: "Binomial theorem and counting", covers: ["binomial expansion", "permutations", "combinations"] },
    { id: "num-proof", unit: "1", code: "1.4", name: "Proof", covers: ["induction", "contradiction", "counterexample"] },
    { id: "num-complex", unit: "1", code: "1.5", name: "Complex numbers", ahl: true, covers: ["Cartesian/polar/Euler form", "De Moivre", "roots of unity"] },
    { id: "num-systems", unit: "1", code: "1.6", name: "Systems of linear equations", ahl: true, covers: ["up to 3 unknowns", "infinite/no solutions"] },
    { id: "fn-basics", unit: "2", code: "2.1", name: "Function fundamentals", covers: ["domain/range", "composite", "inverse"] },
    { id: "fn-transform", unit: "2", code: "2.2", name: "Graphs and transformations", covers: ["translations", "stretches", "reflections"] },
    { id: "fn-poly-rational", unit: "2", code: "2.3", name: "Quadratics, polynomials and rational functions", covers: ["discriminant", "factor/remainder theorem", "asymptotes"] },
    { id: "fn-ineq-modulus", unit: "2", code: "2.4", name: "Inequalities, modulus and symmetry", ahl: true, covers: ["|f(x)|, f(|x|)", "1/f(x)", "odd/even functions"] },
    { id: "geo-trig-triangles", unit: "3", code: "3.1", name: "3D geometry and triangle trigonometry", covers: ["sine/cosine rule", "arcs and sectors", "volumes"] },
    { id: "geo-trig-functions", unit: "3", code: "3.2", name: "Trig functions, identities and equations", covers: ["unit circle", "compound angles (AHL)", "reciprocal trig (AHL)"] },
    { id: "geo-vectors", unit: "3", code: "3.3", name: "Vectors, lines and planes", ahl: true, covers: ["scalar/vector product", "lines", "planes", "intersections"] },
    { id: "stat-descriptive", unit: "4", code: "4.1", name: "Descriptive statistics and regression", covers: ["measures of centre/spread", "correlation", "regression"] },
    { id: "stat-probability", unit: "4", code: "4.2", name: "Probability", covers: ["Venn/tree diagrams", "conditional probability", "Bayes (AHL)"] },
    { id: "stat-distributions", unit: "4", code: "4.3", name: "Random variables and distributions", covers: ["binomial", "normal", "continuous PDFs (AHL)"] },
    { id: "calc-diff", unit: "5", code: "5.1", name: "Limits and differentiation", covers: ["first principles", "chain/product/quotient rules", "implicit (AHL)"] },
    { id: "calc-diff-apps", unit: "5", code: "5.2", name: "Applications of differentiation", covers: ["tangents/normals", "optimisation", "kinematics", "related rates (AHL)"] },
    { id: "calc-int", unit: "5", code: "5.3", name: "Integration techniques", covers: ["substitution", "by parts (AHL)", "partial fractions (AHL)"] },
    { id: "calc-int-apps", unit: "5", code: "5.4", name: "Applications of integration", covers: ["areas", "volumes of revolution (AHL)", "kinematics"] },
    { id: "calc-de", unit: "5", code: "5.5", name: "Differential equations", ahl: true, covers: ["separable", "homogeneous", "integrating factor", "Euler's method"] },
    { id: "calc-series", unit: "5", code: "5.6", name: "Maclaurin series and limits", ahl: true, covers: ["Maclaurin series", "L'Hôpital's rule"] },
  ],
};

export default mathAAHL;
