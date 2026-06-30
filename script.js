const API_URL = "https://script.google.com/macros/s/AKfycbx-Wj-Tr6aYBAYyDdKpTcL9po84fqTBlmdY3plEelfGOJPZgL148N7kYeEOUHeyiYZrUA/exec";
const API_KEY = "noscammerspls";
const SELECTED_GROUP_KEY = "selectedGroup";
const RECENT_EXERCISES_KEY = "recentExercisesByGroup";
const LAST_SET_KEY = "lastSetByExercise";

const muscleGroups = {
    chestBack: ["flat bench", "incline smith", "flat smith", "close pulldown", "chindown", "normal pulldown", "incline flyes", "incline bench", "bb row", "db row", "db bench", "cable row", "db incline", "high row"],
    legs: ["skwaat", "lung", "leg press", "RDL", "hack", "ham curl", "calf?", "leg extension", "deadlift", "bulgarian"],
    shoulders: ["OHP", "smif OHP", "lateral raise", "db press", "uptight hoes", "rear delt"],
    arms: ["db curl", "pushdown", "cable curl", "bb curl", "overhead extension", "JM press", "skullcrusher", "concentration curl", "hammer curl"]
};

const groupLabels = {
    chestBack: "Chest / Back",
    legs: "Legs",
    shoulders: "Shoulders",
    arms: "Arms"
};

function selectWorkout(group) {
    if (!muscleGroups[group]) return;
    localStorage.setItem(SELECTED_GROUP_KEY, group);
    window.location.href = "workout.html";
}

function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (error) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getRecentExercises(group) {
    const recentByGroup = readJSON(RECENT_EXERCISES_KEY, {});
    return Array.isArray(recentByGroup[group]) ? recentByGroup[group] : [];
}

function rememberExercise(group, exercise) {
    const recentByGroup = readJSON(RECENT_EXERCISES_KEY, {});
    const current = Array.isArray(recentByGroup[group]) ? recentByGroup[group] : [];
    recentByGroup[group] = [exercise, ...current.filter(item => item !== exercise)].slice(0, 6);
    writeJSON(RECENT_EXERCISES_KEY, recentByGroup);
}

function rememberSet(exercise, set) {
    const lastSetByExercise = readJSON(LAST_SET_KEY, {});
    lastSetByExercise[exercise] = set;
    writeJSON(LAST_SET_KEY, lastSetByExercise);
}

function getLastLocalSet(exercise) {
    return readJSON(LAST_SET_KEY, {})[exercise];
}

function buildExerciseList(group) {
    const exercises = muscleGroups[group] ?? [];
    const recent = getRecentExercises(group).filter(exercise => exercises.includes(exercise));
    return [...recent, ...exercises.filter(exercise => !recent.includes(exercise))];
}

function setStatus(message, tone = "neutral") {
    const status = document.getElementById("form-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
}

function setLastWorkout(message, state = "idle") {
    const lastWorkout = document.getElementById("last-workout");
    if (!lastWorkout) return;
    lastWorkout.textContent = message;
    lastWorkout.dataset.state = state;
}

function populateExercises(group, selectedExercise = "") {
    const dropdown = document.getElementById("exercise-dropdown");
    if (!dropdown) return;

    dropdown.replaceChildren();

    const placeholder = new Option("Choose exercise", "", true, !selectedExercise);
    placeholder.disabled = true;
    dropdown.add(placeholder);

    buildExerciseList(group).forEach(exercise => {
        dropdown.add(new Option(exercise, exercise, false, exercise === selectedExercise));
    });
}

async function fetchLastWorkout(exercise) {
    if (!exercise) {
        setLastWorkout("Pick an exercise to see last performance.");
        return;
    }

    const localSet = getLastLocalSet(exercise);
    const fallbackText = localSet
        ? `Last local set: ${localSet.weight} lb x ${localSet.reps}`
        : `No recent local set for ${exercise}.`;

    setLastWorkout("Fetching last performance...", "loading");

    try {
        const response = await fetch(`${API_URL}?exercise=${encodeURIComponent(exercise)}`);
        const data = await response.json();

        if (data?.date && data?.sets) {
            setLastWorkout(`Last did ${exercise} on ${data.date}: ${data.sets}`, "ready");
            return;
        }

        setLastWorkout(fallbackText, localSet ? "ready" : "empty");
    } catch (error) {
        console.error("Error fetching workout data:", error);
        setLastWorkout(fallbackText, localSet ? "ready" : "error");
    }
}

function wireSplitPage() {
    document.querySelectorAll("[data-group]").forEach(button => {
        button.addEventListener("click", () => selectWorkout(button.dataset.group));
    });
}

function wireWorkoutPage() {
    const selectedGroup = localStorage.getItem(SELECTED_GROUP_KEY);
    const form = document.getElementById("workoutForm");
    const dropdown = document.getElementById("exercise-dropdown");
    const workoutHeader = document.getElementById("workout-header");

    if (!form || !dropdown) return;

    if (!selectedGroup || !muscleGroups[selectedGroup]) {
        window.location.href = "index.html";
        return;
    }

    if (workoutHeader) {
        workoutHeader.textContent = groupLabels[selectedGroup] ?? "Workout";
    }

    populateExercises(selectedGroup);

    dropdown.addEventListener("change", () => {
        setStatus("");
        fetchLastWorkout(dropdown.value);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const submitButton = form.querySelector("button[type='submit']");
        const exercise = form.exercise.value;
        const reps = form.reps.value.trim();
        const weight = form.weight.value.trim();

        if (!exercise || !reps || !weight) {
            setStatus("Fill in exercise, weight, and reps.", "error");
            return;
        }

        const loggedAt = new Date().toISOString();
        const payload = {
            apiKey: API_KEY,
            date: loggedAt,
            group: selectedGroup,
            exercise,
            weight,
            reps
        };

        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
        setStatus("");

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            rememberExercise(selectedGroup, exercise);
            rememberSet(exercise, { reps, weight, date: loggedAt, group: selectedGroup });
            populateExercises(selectedGroup, exercise);
            setStatus(`Logged ${weight} lb x ${reps}.`, "success");
        } catch (error) {
            console.error("Error logging workout:", error);
            setStatus("Failed to log set. Try again.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Log set";
            form.reps.focus();
            form.reps.select();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    wireSplitPage();
    wireWorkoutPage();
});

window.selectWorkout = selectWorkout;
