const muscleGroups = {
    chestBack: ["flat bench", "incline smith", "flat smith", "close pulldown", "chindown", "normal pulldown", "incline flyes", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension", "deadlift", "bulgarian"],
    shoulders: ["OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "bb curl", "overhead extension", "JM press", "skullcrusher", "concentration curl", "hammer curl"]
};

// Function to select a workout group and navigate
function selectWorkout(group) {
    console.log(`Button clicked: ${group}`);
    localStorage.setItem("selectedGroup", group);
    window.location.href = "workout.html";
}

window.selectWorkout = selectWorkout;

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const workoutHeader = document.getElementById("workout-header");

        if (selectedGroup && workoutHeader) {
            workoutHeader.textContent = selectedGroup.replace(/([A-Z])/g, " $1").trim().toLowerCase();
        }
    }

    // Populate dropdown with exercises
    if (window.location.pathname.endsWith("workout.html")) {
        const selectedGroup = localStorage.getItem("selectedGroup");
        const dropdownElement = document.getElementById("exercise-dropdown");

        if (selectedGroup && muscleGroups[selectedGroup]) {
            const exercises = muscleGroups[selectedGroup];
            dropdownElement.innerHTML = ""; // Clear existing options

            // Add a default option
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Choose exercise";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            dropdownElement.appendChild(defaultOption);

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

                lastWorkoutDiv.textContent = "Loading...";

                try {
                    const response = await fetch(
                        `https://script.google.com/macros/s/AKfycbx-Wj-Tr6aYBAYyDdKpTcL9po84fqTBlmdY3plEelfGOJPZgL148N7kYeEOUHeyiYZrUA/exec?exercise=${encodeURIComponent(exercise)}`
                    );

                    const rawResponse = await response.text();
                    console.log("Raw API Response:", rawResponse);

                    try {
                        const data = JSON.parse(rawResponse);
                        console.log("Parsed Data:", data);

                        const { date, sets } = data;
                        if (date && sets) {
                            lastWorkoutDiv.textContent = `Last did ${exercise} on ${date}: ${sets}`;
                        } else {
                            console.error("Invalid data format:", data);
                            lastWorkoutDiv.textContent = `Error: No valid data found for ${exercise}.`;
                        }
                    } catch (e) {
                        console.error("Invalid JSON from API:", rawResponse);
                        lastWorkoutDiv.textContent = "Error parsing workout data.";
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
                await fetch(
                    "https://script.google.com/macros/s/AKfycbx-Wj-Tr6aYBAYyDdKpTcL9po84fqTBlmdY3plEelfGOJPZgL148N7kYeEOUHeyiYZrUA/exec",
                    {
                        method: "POST",
                        mode: "no-cors", // Use no-cors mode
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    }
                );

                alert("Set logged!");

                lastWeight = weight; // Retain weight for convenience
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
