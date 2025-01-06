const muscleGroups = {
    chestBack: ["flat bench", "incline smith", "flat smith", "close pulldown", "chindown", "normal pulldown","incline flyes", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension", "deadlift", "bulgarian"],
    shoulders: ["OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "bb curl", "overhead extension", "JM press", "skullcrusher", "concentration curl", "hammer curl"]
};

// Move the selectWorkout function outside of DOMContentLoaded
function selectWorkout(group) {
    console.log(`Button clicked: ${group}`); // Debug log
    localStorage.setItem("selectedGroup", group);
    window.location.href = "workout.html";
}

// Attach the function to the global scope
window.selectWorkout = selectWorkout;

console.log("selectWorkout is now globally accessible");

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const workoutHeader = document.getElementById("workout-header");

        if (selectedGroup && workoutHeader) {
            workoutHeader.textContent = selectedGroup.replace(/([A-Z])/g, " $1").trim().toLowerCase(); // Format "chestBack" to "Chest Back"
        }
    }

    // Populate dropdown on workout page
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const dropdownElement = document.getElementById("exercise-dropdown");
        console.log("Selected Group from localStorage:", selectedGroup);
        console.log("Muscle Groups:", muscleGroups);

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

            // Attach change listener to dropdown
            dropdownElement.addEventListener("change", async function () {
                const exercise = this.value;
                if (!exercise) return;

                const lastWorkoutDiv = document.getElementById("last-workout");
                if (!lastWorkoutDiv) {
                    console.error("Error: #last-workout div not found in DOM");
                    return;
                }

                // Show loading message
                lastWorkoutDiv.textContent = "Loading...";

                try {
                    const response = await fetch(`https://script.google.com/macros/s/AKfycbxwOFdrVaUiADl-yOo0fPNSHr-dyfUVayxo3rwtmM2ujfwDuVzCUdsGrtihfuBrw32JAw/exec?exercise=${encodeURIComponent(exercise)}`);
                    const rawResponse = await response.text();

                    try {
                        let data = JSON.parse(rawResponse);

                        if (data.message) {
                            lastWorkoutDiv.textContent = `No data found for ${exercise}`;
                        } else {
                            const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit"
                            });
                            lastWorkoutDiv.textContent = `Last did ${exercise}: ${data.sets}`;
                        }
                    } catch (e) {
                        console.error("Invalid JSON from API:", rawResponse);
                        lastWorkoutDiv.textContent = "Error fetching workout data.";
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    lastWorkoutDiv.textContent = "Error fetching workout data.";
                }
            });
        }
    }

    // Handle form submission
    const form = document.getElementById("workoutForm");
    const API_KEY = "noscammerspls";
    let lastWeight = null; // Default weight tracker
    let lastExercise = null; // Default exercise tracker

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitButton = form.querySelector("button[type='submit']");
            submitButton.disabled = true; // Disable the button
            submitButton.textContent = "Saving..."; // Update button text

            const exercise = form.exercise.value || lastExercise;
            const reps = form.reps.value;
            const weight = form.weight.value || lastWeight; // Use last weight if not specified

            if (!exercise || !reps || !weight) {
                alert("Please fill out all fields.");
                submitButton.disabled = false;
                submitButton.textContent = "Submit";
                return;
            }

            const data = {
                apiKey: API_KEY,
                exercise: exercise,
                reps: reps,
                weight: weight,
                date: new Date().toISOString()
            };

            try {
                await fetch("https://script.google.com/macros/s/AKfycbwwz4uIaESy-WYhYVPuabcdGn9OYN1ek6FGIU0DLZ7ATp218sULf4RIqSUjVS6_0mewCA/exec", {
                    method: "POST",
                    body: JSON.stringify(data),
                    headers: { "Content-Type": "application/json" },
                    mode: "no-cors"
                });

                alert("Set logged!");

                // Update last weight and exercise
                lastWeight = weight;
                lastExercise = exercise;

                // Clear the reps field for the next set
                form.reps.value = "";

                // Keep the weight and exercise fields pre-filled
                form.weight.value = lastWeight;
                form.exercise.value = lastExercise;
            } catch (error) {
                console.error("Error:", error);
                alert("Failed to log set. Please try again.");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Submit";
            }
        });
    }
});
