import type { Subject } from "@/lib/types";

// IB Physics (first assessment 2025). AHL = additional higher level.
const physicsHL: Subject = {
  id: "physics-hl",
  name: "Physics HL",
  shortName: "Physics",
  level: "HL",
  colorSlot: 1,
  numericTolerance: 0.02,
  papers: [
    { id: "P1", name: "Paper 1", description: "1A multiple choice + 1B data-based questions" },
    { id: "P2", name: "Paper 2", description: "Short-answer and extended-response questions" },
  ],
  units: [
    { id: "A", name: "Space, time and motion" },
    { id: "B", name: "The particulate nature of matter" },
    { id: "C", name: "Wave behaviour" },
    { id: "D", name: "Fields" },
    { id: "E", name: "Nuclear and quantum physics" },
  ],
  topics: [
    { id: "A.1", unit: "A", code: "A.1", name: "Kinematics", covers: ["suvat", "projectiles", "fluid resistance"] },
    { id: "A.2", unit: "A", code: "A.2", name: "Forces and momentum", covers: ["Newton's laws", "impulse", "circular motion"] },
    { id: "A.3", unit: "A", code: "A.3", name: "Work, energy and power", covers: ["conservation of energy", "efficiency"] },
    { id: "A.4", unit: "A", code: "A.4", name: "Rigid body mechanics", ahl: true, covers: ["torque", "moment of inertia", "angular momentum"] },
    { id: "A.5", unit: "A", code: "A.5", name: "Galilean and special relativity", ahl: true, covers: ["Lorentz transformations", "time dilation", "spacetime diagrams"] },
    { id: "B.1", unit: "B", code: "B.1", name: "Thermal energy transfers", covers: ["specific heat", "latent heat", "conduction", "radiation"] },
    { id: "B.2", unit: "B", code: "B.2", name: "Greenhouse effect", covers: ["albedo", "emissivity", "energy balance"] },
    { id: "B.3", unit: "B", code: "B.3", name: "Gas laws", covers: ["ideal gas", "kinetic model"] },
    { id: "B.4", unit: "B", code: "B.4", name: "Thermodynamics", ahl: true, covers: ["first law", "entropy", "heat engines"] },
    { id: "B.5", unit: "B", code: "B.5", name: "Current and circuits", covers: ["resistance", "internal resistance", "power"] },
    { id: "C.1", unit: "C", code: "C.1", name: "Simple harmonic motion", covers: ["defining equation", "energy in SHM", "phase (AHL)"] },
    { id: "C.2", unit: "C", code: "C.2", name: "Wave model", covers: ["wave equation", "transverse/longitudinal"] },
    { id: "C.3", unit: "C", code: "C.3", name: "Wave phenomena", covers: ["refraction", "interference", "diffraction"] },
    { id: "C.4", unit: "C", code: "C.4", name: "Standing waves and resonance", covers: ["harmonics", "damping"] },
    { id: "C.5", unit: "C", code: "C.5", name: "Doppler effect", covers: ["sound", "light (red/blue shift)"] },
    { id: "D.1", unit: "D", code: "D.1", name: "Gravitational fields", covers: ["Newton's law of gravitation", "orbits", "potential (AHL)"] },
    { id: "D.2", unit: "D", code: "D.2", name: "Electric and magnetic fields", covers: ["Coulomb's law", "field lines", "potential (AHL)"] },
    { id: "D.3", unit: "D", code: "D.3", name: "Motion in electromagnetic fields", covers: ["charged particles in fields", "force on a wire"] },
    { id: "D.4", unit: "D", code: "D.4", name: "Induction", ahl: true, covers: ["Faraday's law", "Lenz's law", "generators"] },
    { id: "E.1", unit: "E", code: "E.1", name: "Structure of the atom", covers: ["Rutherford scattering", "energy levels"] },
    { id: "E.2", unit: "E", code: "E.2", name: "Quantum physics", ahl: true, covers: ["photoelectric effect", "de Broglie", "Compton scattering"] },
    { id: "E.3", unit: "E", code: "E.3", name: "Radioactive decay", covers: ["half-life", "binding energy", "decay types"] },
    { id: "E.4", unit: "E", code: "E.4", name: "Fission", covers: ["chain reactions", "reactors"] },
    { id: "E.5", unit: "E", code: "E.5", name: "Fusion and stars", covers: ["stellar evolution", "HR diagrams"] },
  ],
};

export default physicsHL;
