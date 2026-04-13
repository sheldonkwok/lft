export type Equipment = "barbell" | "dumbbell";

export type Exercise = {
	name: string;
	muscleGroup: string;
	equipment: Equipment;
};

export const EXERCISES: Exercise[] = [
	{ name: "Bench", muscleGroup: "chest", equipment: "barbell" },
	{ name: "Incline Bench", muscleGroup: "chest", equipment: "barbell" },
];
