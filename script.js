const form = document.getElementById("workoutForm");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
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
