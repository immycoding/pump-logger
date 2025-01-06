const muscleGroups = {
    chestBack: ["flat bench", "incline smith", "flat smith", "close pulldown", "chindown", "normal pulldown","incline flyes", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension", "deadlift", "bulgarian"],
    shoulders: ["OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "bb curl", "overhead extension", "JM press", "skullcrusher", "concentration curl", "hammer curl"]
};

// Function to select a workout group and navigate
function selectWorkout(group) {
    console.log(`Button clicked: ${group}`); // Debug log
    localStorage.setItem("selectedGroup", group);
    window.location.href = "workout.html";
}

window.selectWorkout = selectWorkout; // Make the function globally accessible

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const workoutHeader = document.getElementById("workout-header");

        if (selectedGroup && workoutHeader) {
            workoutHeader.textContent = selectedGroup.replace(/([A-Z])/g, " $1").trim().toLowerCase(); // Format "chestBack" to "Chest Back"
        }
    }

    // Populate dropdown with exercises
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const dropdownElement = document.getElementById("exercise-dropdown");

        if (selectedGroup && muscleGroups[selectedGroup]) {
            const exercises = muscleGroups[selectedGroup];

            // Clear existing options
            dropdownElement.innerHTML = "";

            // Add a default "Choose exercise" option
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Choose exercise";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            dropdownElement.appendChild(defaultOption);

            // Populate dropdown with exercises
            exercises.forEach(exercise => {
                const option = document.createElement("option");
                option.value = exercise;
                option.textContent = exercise;
                dropdownElement.appendChild(option);
            });

            // Fetch last workout data for selected exercise
            dropdownElement.addEventListener("change", async function () {
                const exercise = this.value;
                if (!exercise) return;

                const lastWorkoutDiv = document.getElementById("last-workout");
                if (!lastWorkoutDiv) {
                    console.error("Error: #last-workout div not found in DOM");
                    return;
                }

                // Display loading message
                lastWorkoutDiv.textContent = "Loading...";

                try {
                    const response = await fetch(`https://script.google.com/macros/s/AKfycbxwOFdrVaUiADl-yOo0fPNSHr-dyfUVayxo3rwtmM2ujfwDuVzCUdsGrtihfuBrw32JAw/exec?exercise=${encodeURIComponent(exercise)}`);
                    const rawResponse = await response.text();

                    try {
                        const data = JSON.parse(rawResponse);

                        if (data.message) {
                            lastWorkoutDiv.textContent = `No data found for ${exercise}`;
                        } else {
                            lastWorkoutDiv.textContent = `Last did ${exercise} on ${data.date}: ${data.sets}`;
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
    let lastWeight = null;

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitButton = form.querySelector("button[type='submit']");
            submitButton.disabled = true;
            submitButton.textContent = "Saving...";

            const exercise = form.exercise.value;
            const reps = form.reps.value;
            const weight = form.weight.value || lastWeight;

            if (!exercise || !reps || !weight) {
                alert("Please fill out all fields.");
                submitButton.disabled = false;
                submitButton.textContent = "Submit";
                return;
            }

            const data = {
                apiKey: API_KEY,
                exercise,
                reps,
                weight,
                date: new Date().toISOString()
            };

            try {
                await fetch("https://script.google.com/macros/s/AKfycbxwOFdrVaUiADl-yOo0fPNSHr-dyfUVayxo3rwtmM2ujfwDuVzCUdsGrtihfuBrw32JAw/exec", {
                    method: "POST",
                    body: JSON.stringify(data),
                    headers: { "Content-Type": "application/json" }
                });

                alert("Set logged!");

                // Update last weight and reset fields
                lastWeight = weight;
                form.reps.value = ""; // Clear reps field
                form.weight.value = lastWeight; // Retain weight
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
