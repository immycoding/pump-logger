const form = document.getElementById("workoutForm");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
        exercise: form.exercise.value,
        sets: form.sets.value,
        reps: form.reps.value,
        weight: form.weight.value,
    };

    fetch("https://script.google.com/macros/s/AKfycbz27wpoNqE-4VCfRhIQrsiPiU1dFsrjGDz2oOIZhwdSZywufyqw7v4E7SXvVsOYjl18SA/exec", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        mode: "no-cors"
    })
        .then((response) => response.text())
        .then((data) => alert("Workout saved!"))
        .catch((error) => console.error("Error:", error));
});
