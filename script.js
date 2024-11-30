const muscleGroups = {
    chestBack: ["flat bench", "pulldown", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension"],
    shoulders: ["OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "bb curl", "overhead extension", "JM press", "skullcrusher"]
};

// Make selectWorkout globally accessible
function selectWorkout(group) {
    console.log(`Button clicked: ${group}`); // Debug log
    localStorage.setItem("selectedGroup", group);
    window.location.href = "workout.html";
}
window.selectWorkout = selectWorkout; // Attach to global scope

document.addEventListener("DOMContentLoaded", () => {
    // Populate dropdown on workout page
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const dropdownElement = document.getElementById("exercise-dropdown");

        if (selectedGroup && muscleGroups[selectedGroup]) {
            const exercises = muscleGroups[selectedGroup];

            // Clear the dropdown to avoid duplicate options
            dropdownElement.innerHTML = "";

            // Add a default "Choose exercise" option
            const defaultOption = document.createElement("option");
            defaultOption.value = ""; // Ensure no value is selected
            defaultOption.textContent = "Choose exercise";
            defaultOption.disabled = true;
            defaultOption.selected = true; // Start with this option selected
            dropdownElement.appendChild(defaultOption);

            // Add exercises to the dropdown
            exercises.forEach((exercise) => {
                const option = document.createElement("option");
                option.value = exercise;
                option.textContent = exercise;
                dropdownElement.appendChild(option);
            });
        }
    }

    // Handle form submission
    const form = document.getElementById("workoutForm");
    const API_KEY = "noscammerspls";

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dropdownElement = document.getElementById("exercise-dropdown");

            const data = {
                apiKey: API_KEY,
                exercise: form.exercise.value,
                sets: form.sets.value,
                reps: form.reps.value,
                weight: form.weight.value,
            };

            try {
                await fetch("https://script.google.com/macros/s/AKfycbwwz4uIaESy-WYhYVPuabcdGn9OYN1ek6FGIU0DLZ7ATp218sULf4RIqSUjVS6_0mewCA/exec", {
                    method: "POST",
                    body: JSON.stringify(data),
                    headers: { "Content-Type": "application/json" },
                    mode: "no-cors"
                });

                alert("Workout saved!");

                // Clear the form fields
                form.reset();

                // Explicitly reset the dropdown to "Choose exercise"
                if (dropdownElement) {
                    dropdownElement.value = ""; // Reset dropdown to default
                    dropdownElement.selectedIndex = 0; // Ensure the first option is selected
                }

                // Clear any displayed data for the last workout
                const lastWorkoutDiv = document.getElementById("last-workout");
                if (lastWorkoutDiv) {
                    lastWorkoutDiv.textContent = ""; // Clear last workout info
                }
            } catch (error) {
                console.error("Error:", error);
                alert("Failed to save workout. Please try again.");
            }
        });
    }
});
