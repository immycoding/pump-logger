const API_URL = "https://script.google.com/macros/s/AKfycbx-Wj-Tr6aYBAYyDdKpTcL9po84fqTBlmdY3plEelfGOJPZgL148N7kYeEOUHeyiYZrUA/exec";
const API_KEY = "noscammerspls";
const SELECTED_GROUP_KEY = "selectedGroup";
const RECENT_EXERCISES_KEY = "recentExercisesByGroup";
const LAST_SET_KEY = "lastSetByExercise";
const SET_HISTORY_KEY = "setHistoryByExercise";
const PERFORMANCE_LIMIT = 3;

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

function rememberLoggedSet(exercise, set) {
    const historyByExercise = readJSON(SET_HISTORY_KEY, {});
    const current = Array.isArray(historyByExercise[exercise]) ? historyByExercise[exercise] : [];
    historyByExercise[exercise] = [...current, set].slice(-200);
    writeJSON(SET_HISTORY_KEY, historyByExercise);
    rememberSet(exercise, set);
}

function getLocalSets(exercise) {
    return readJSON(SET_HISTORY_KEY, {})[exercise] ?? [];
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

function getDateKey(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return String(dateValue);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
    const todayKey = getDateKey(new Date());
    if (dateKey === todayKey) return "Today";

    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function normalizeSet(set, index = 0) {
    if (typeof set === "string") {
        return { summary: set, order: index };
    }

    if (!set || typeof set !== "object") {
        return { summary: String(set), order: index };
    }

    const weight = set.weight ?? set.Weight;
    const reps = set.reps ?? set.Reps;
    const loggedAt = set.date ?? set.loggedAt ?? set.timestamp ?? set.Timestamp;
    const order = Number(set.order ?? set.setNumber ?? set.Set ?? index);

    return {
        weight,
        reps,
        loggedAt,
        order: Number.isFinite(order) ? order : index,
        summary: weight !== undefined && reps !== undefined
            ? `${weight} lb x ${reps}`
            : set.summary ?? set.sets ?? String(set)
    };
}

function normalizePerformance(performance, index = 0) {
    const date = performance?.date ?? performance?.Date ?? performance?.loggedAt ?? performance?.timestamp;
    const sets = performance?.sets ?? performance?.Sets ?? performance?.entries ?? performance?.setList;

    if (!date && !sets) return null;

    return {
        dateKey: getDateKey(date),
        date,
        order: index,
        sets: Array.isArray(sets) ? sets.map(normalizeSet) : [normalizeSet(sets ?? performance, index)]
    };
}

function normalizeBackendPerformances(data) {
    const candidates = Array.isArray(data)
        ? data
        : data?.performances ?? data?.history ?? data?.workouts ?? data?.entries ?? data?.rows;

    if (Array.isArray(candidates)) {
        const grouped = new Map();

        candidates.forEach((item, index) => {
            const performance = normalizePerformance(item, index);
            if (performance && item?.sets !== undefined) {
                grouped.set(performance.dateKey, performance);
                return;
            }

            const date = item?.date ?? item?.Date ?? item?.loggedAt ?? item?.timestamp;
            const dateKey = getDateKey(date);
            const set = normalizeSet(item, index);
            const current = grouped.get(dateKey) ?? { dateKey, date, order: index, sets: [] };
            current.sets.push(set);
            grouped.set(dateKey, current);
        });

        return Array.from(grouped.values());
    }

    const single = normalizePerformance(data, 0);
    return single ? [single] : [];
}

function getLocalPerformances(exercise) {
    const grouped = new Map();

    getLocalSets(exercise).forEach((set, index) => {
        const dateKey = getDateKey(set.date ?? set.loggedAt);
        const current = grouped.get(dateKey) ?? { dateKey, date: set.date, order: index, sets: [] };
        current.sets.push(normalizeSet(set, index));
        grouped.set(dateKey, current);
    });

    return Array.from(grouped.values());
}

function mergePerformances(backendPerformances, localPerformances) {
    const todayKey = getDateKey(new Date());
    const grouped = new Map();

    backendPerformances.forEach(performance => {
        grouped.set(performance.dateKey, { ...performance, sets: [...performance.sets] });
    });

    localPerformances.forEach(performance => {
        const existing = grouped.get(performance.dateKey);

        if (!existing || performance.dateKey === todayKey) {
            grouped.set(performance.dateKey, { ...performance, sets: [...performance.sets] });
            return;
        }

        existing.sets.push(...performance.sets);
    });

    return Array.from(grouped.values())
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .slice(0, PERFORMANCE_LIMIT)
        .map(performance => ({
            ...performance,
            sets: performance.sets.sort((a, b) => {
                const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : NaN;
                const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : NaN;

                if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
                    return aTime - bTime;
                }

                return a.order - b.order;
            })
        }));
}

function formatPerformances(exercise, performances) {
    if (!performances.length) {
        return `No recent performance for ${exercise}.`;
    }

    const lines = performances.map(performance => {
        const setSummary = performance.sets.map(set => set.summary).join(", ");
        return `${formatDateLabel(performance.dateKey)}: ${setSummary}`;
    });

    return `Last ${performances.length} for ${exercise}:\n${lines.join("\n")}`;
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
    const localPerformances = getLocalPerformances(exercise);
    const localSummary = mergePerformances([], localPerformances);
    let fallbackText = `No recent local set for ${exercise}.`;

    if (localSummary.length) {
        fallbackText = formatPerformances(exercise, localSummary);
    } else if (localSet) {
        fallbackText = `Last local set: ${localSet.weight} lb x ${localSet.reps}`;
    }

    setLastWorkout("Fetching recent performances...", "loading");

    try {
        const response = await fetch(`${API_URL}?exercise=${encodeURIComponent(exercise)}&limit=${PERFORMANCE_LIMIT}`);
        const data = await response.json();
        const performances = mergePerformances(normalizeBackendPerformances(data), localPerformances);

        if (performances.length) {
            setLastWorkout(formatPerformances(exercise, performances), "ready");
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
            rememberLoggedSet(exercise, { reps, weight, date: loggedAt, group: selectedGroup });
            populateExercises(selectedGroup, exercise);
            setStatus(`Logged ${weight} lb x ${reps}.`, "success");
            fetchLastWorkout(exercise);
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
