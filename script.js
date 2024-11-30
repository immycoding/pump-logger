const muscleGroups = {
    chestBack: ["flat bench", "pulldown", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension"],
    shoulders: ["OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "bb curl", "overhead extension", "JM press", "skullcrusher"]
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
    // Populate dropdown on workout page
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const dropdownElement = document.getElementById("exercise-dropdown");

        if (selectedGroup && muscleGroups[selectedGroup]) {
            const exercises = muscleGroups[selectedGroup];
            exercises.forEach((exercise) => {
                const option = document.createElement("option");
                option.value = exercise;
                option.textContent = exercise;
                dropdownElement.appendChild(option);
            });
        }

        // Attach change listener to dropdown
        if (dropdownElement) {
            dropdownElement.addEventListener("change", async function () {
                const exercise = this.value;
                if (!exercise) return;

                console.log(`Fetching data for exercise: ${exercise}`); // Log selected exercise

                try {
                    const response = await fetch(`https://script.google.com/macros/s/AKfycbxwOFdrVaUiADl-yOo0fPNSHr-dyfUVayxo3rwtmM2ujfwDuVzCUdsGrtihfuBrw32JAw/exec?exercise=${encodeURIComponent(exercise)}`);
                    const rawResponse = await response.text();
                    console.log("Raw response from server:", rawResponse);

                    const lastWorkoutDiv = document.getElementById("last-workout");
                    if (!lastWorkoutDiv) {
                        console.error("Error: #last-workout div not found in DOM");
                        return;
                    }

                    try {
                        const data = JSON.parse(rawResponse); // Parse JSON response
                        console.log("Parsed response:", data);

                        if (data.message) {
                            lastWorkoutDiv.textContent = `No data found for ${exercise}`;
                        } else {
                            // Format the date as MM-DD-YYYY
                            const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit"
                            });
                            lastWorkoutDiv.textContent = `Last did ${data.exercise}: ${data.weight} lbs, ${data.sets} sets of ${data.reps} on ${formattedDate}`;
                        }
                    } catch (error) {
                        console.error("Error parsing JSON:", error, rawResponse);
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            });
        }
    }

    // Handle form submission
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

            fetch("https://script.google.com/macros/s/AKfycbxwOFdrVaUiADl-yOo0fPNSHr-dyfUVayxo3rwtmM2ujfwDuVzCUdsGrtihfuBrw32JAw/exec", {
                method: "POST",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" }
            })
                .then((response) => response.text())
                .then((data) => {
                    if (data === "Success") {
                        alert("Workout saved!");
                    } else {
                        console.error("Error from server:", data);
                    }
                })
                .catch((error) => console.error("Error:", error));
        });
    }
});




