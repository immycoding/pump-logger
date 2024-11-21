const muscleGroups = {
    chestBack: ["flat bench", "pulldown", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension"],
    shoulders: ["OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "bb curl", "overhead extension", "JM press", "skullcrusher"]
};

function selectWorkout(group) {
    // Save the selected group in localStorage to pass data to the next page
    localStorage.setItem("selectedGroup", group);

    // Navigate to the workout page
    window.location.href = "workout.html";
}

// On the workout page, populate the dropdown
if (window.location.pathname.endsWith("workout.html")) {
    const selectedGroup = localStorage.getItem("selectedGroup");
    const dropdown = document.getElementById("exercise-dropdown");

    if (selectedGroup && muscleGroups[selectedGroup]) {
        const exercises = muscleGroups[selectedGroup];
        exercises.forEach((exercise) => {
            const option = document.createElement("option");
            option.value = exercise;
            option.textContent = exercise;
            dropdown.appendChild(option);
        });
    }
}

const form = document.getElementById("workoutForm");
const API_KEY = "noscammerspls";

if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const data = {
            apiKey: API_KEY,
            exercise: form.exercise.value,
            sets: form.sets.value,
            reps: form.reps.value,
            weight: form.weight.value,
        };

        fetch("https://script.google.com/macros/s/AKfycbwwz4uIaESy-WYhYVPuabcdGn9OYN1ek6FGIU0DLZ7ATp218sULf4RIqSUjVS6_0mewCA/exec", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" },
            mode: "no-cors"
        })
            .then((response) => response.text())
            .then((data) => alert("Workout saved!"))
            .catch((error) => console.error("Error:", error));
    });
}
