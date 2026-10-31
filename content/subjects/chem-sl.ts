import type { Subject } from "@/lib/types";

// IB Chemistry SL (first assessment 2025). AHL-only sub-topics are excluded.
const chemSL: Subject = {
  id: "chem-sl",
  name: "Chemistry SL",
  shortName: "Chemistry",
  level: "SL",
  colorSlot: 3,
  numericTolerance: 0.02,
  papers: [
    { id: "P1", name: "Paper 1", description: "1A multiple choice + 1B data-based questions" },
    { id: "P2", name: "Paper 2", description: "Short-answer and extended-response questions" },
  ],
  units: [
    { id: "S1", name: "Structure 1: Models of the particulate nature of matter" },
    { id: "S2", name: "Structure 2: Models of bonding and structure" },
    { id: "S3", name: "Structure 3: Classification of matter" },
    { id: "R1", name: "Reactivity 1: What drives chemical reactions?" },
    { id: "R2", name: "Reactivity 2: How much, how fast and how far?" },
    { id: "R3", name: "Reactivity 3: What are the mechanisms of chemical change?" },
  ],
  topics: [
    { id: "S1.1", unit: "S1", code: "S1.1", name: "Introduction to the particulate nature of matter", covers: ["states of matter", "mixtures"] },
    { id: "S1.2", unit: "S1", code: "S1.2", name: "The nuclear atom", covers: ["subatomic particles", "isotopes", "relative atomic mass"] },
    { id: "S1.3", unit: "S1", code: "S1.3", name: "Electron configurations", covers: ["emission spectra", "orbitals", "Aufbau"] },
    { id: "S1.4", unit: "S1", code: "S1.4", name: "Counting particles by mass: the mole", covers: ["molar mass", "empirical formula", "concentration"] },
    { id: "S1.5", unit: "S1", code: "S1.5", name: "Ideal gases", covers: ["molar volume", "pV = nRT"] },
    { id: "S2.1", unit: "S2", code: "S2.1", name: "The ionic model", covers: ["ion formation", "lattices", "formulas"] },
    { id: "S2.2", unit: "S2", code: "S2.2", name: "The covalent model", covers: ["Lewis structures", "VSEPR", "polarity", "IMFs"] },
    { id: "S2.3", unit: "S2", code: "S2.3", name: "The metallic model", covers: ["metallic bonding", "properties"] },
    { id: "S2.4", unit: "S2", code: "S2.4", name: "From models to materials", covers: ["bonding triangle", "alloys", "polymers"] },
    { id: "S3.1", unit: "S3", code: "S3.1", name: "The periodic table: classification of elements", covers: ["periodic trends", "oxidation states"] },
    { id: "S3.2", unit: "S3", code: "S3.2", name: "Functional groups: classification of organic compounds", covers: ["homologous series", "IUPAC naming", "isomers"] },
    { id: "R1.1", unit: "R1", code: "R1.1", name: "Measuring enthalpy changes", covers: ["calorimetry", "q = mcΔT"] },
    { id: "R1.2", unit: "R1", code: "R1.2", name: "Energy cycles in reactions", covers: ["bond enthalpies", "Hess's law"] },
    { id: "R1.3", unit: "R1", code: "R1.3", name: "Energy from fuels", covers: ["combustion", "fossil fuels", "biofuels"] },
    { id: "R2.1", unit: "R2", code: "R2.1", name: "How much? The amount of chemical change", covers: ["stoichiometry", "limiting reagent", "yield"] },
    { id: "R2.2", unit: "R2", code: "R2.2", name: "How fast? The rate of chemical change", covers: ["collision theory", "Maxwell–Boltzmann", "catalysts"] },
    { id: "R2.3", unit: "R2", code: "R2.3", name: "How far? The extent of chemical change", covers: ["dynamic equilibrium", "Le Chatelier", "Kc"] },
    { id: "R3.1", unit: "R3", code: "R3.1", name: "Proton transfer reactions", covers: ["Brønsted–Lowry", "pH", "neutralisation"] },
    { id: "R3.2", unit: "R3", code: "R3.2", name: "Electron transfer reactions", covers: ["oxidation states", "redox", "cells"] },
    { id: "R3.3", unit: "R3", code: "R3.3", name: "Electron sharing reactions", covers: ["radicals", "substitution of alkanes"] },
    { id: "R3.4", unit: "R3", code: "R3.4", name: "Electron-pair sharing reactions", covers: ["nucleophiles", "electrophiles"] },
  ],
};

export default chemSL;
