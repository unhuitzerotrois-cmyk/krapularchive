const monthElement = document.querySelector("#calendar-month");
const gridElement = document.querySelector("#calendar-grid");
const statusElement = document.querySelector("#calendar-status");
const selectedDateElement = document.querySelector("#selected-date");
const eventListElement = document.querySelector("#event-list");
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});
const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const weekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const weekdays = Array.from({ length: 7 }, (_, index) =>
  weekdayFormatter.format(new Date(Date.UTC(2024, 0, index + 1)))
);
const today = new Date();
let displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let events = [];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function showStatus(message) {
  statusElement.textContent = message;
  statusElement.hidden = false;
}

function showEventsForSelectedDate() {
  const date = parseDate(selectedDate);
  const formattedDate = dateFormatter.format(date);
  selectedDateElement.textContent = formattedDate.charAt(0).toLocaleUpperCase("fr-FR") + formattedDate.slice(1);
  eventListElement.replaceChildren();

  const selectedEvents = events.filter((event) => event.date === selectedDate);
  if (!selectedEvents.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "event-list__empty";
    emptyItem.textContent = "Aucun événement prévu ce jour.";
    eventListElement.append(emptyItem);
    return;
  }

  for (const event of selectedEvents) {
    const item = document.createElement("li");
    item.className = "event-card";

    const title = document.createElement("h3");
    title.textContent = event.title;
    item.append(title);

    const details = [event.time, event.location].filter(Boolean).join(" · ");
    if (details) {
      const detailLine = document.createElement("p");
      detailLine.className = "event-card__details";
      detailLine.textContent = details;
      item.append(detailLine);
    }

    if (event.description) {
      const description = document.createElement("p");
      description.className = "event-card__description";
      description.textContent = event.description;
      item.append(description);
    }

    eventListElement.append(item);
  }
}

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const monthTitle = monthFormatter.format(displayedMonth);
  monthElement.textContent = monthTitle.charAt(0).toLocaleUpperCase("fr-FR") + monthTitle.slice(1);
  gridElement.replaceChildren();

  for (const weekday of weekdays) {
    const heading = document.createElement("span");
    heading.className = "calendar-grid__weekday";
    heading.setAttribute("role", "columnheader");
    heading.textContent = weekday.replace(".", "");
    gridElement.append(heading);
  }

  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  for (let index = 0; index < cellCount; index += 1) {
    const day = index - firstDayOffset + 1;
    const cell = document.createElement("div");
    cell.className = "calendar-grid__cell";
    cell.setAttribute("role", "gridcell");

    if (day < 1 || day > daysInMonth) {
      cell.setAttribute("aria-hidden", "true");
      gridElement.append(cell);
      continue;
    }

    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const dayEvents = events.filter((event) => event.date === dateKey);
    const dayButton = document.createElement("button");
    dayButton.className = "calendar-day";
    dayButton.type = "button";
    dayButton.textContent = String(day);
    dayButton.setAttribute("aria-label", `${dateFormatter.format(date)}${dayEvents.length ? `, ${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}` : ""}`);
    dayButton.setAttribute("aria-pressed", String(dateKey === selectedDate));

    if (dayEvents.length) {
      dayButton.classList.add("calendar-day--has-events");
      const count = document.createElement("span");
      count.className = "calendar-day__count";
      count.setAttribute("aria-hidden", "true");
      count.textContent = String(dayEvents.length);
      dayButton.append(count);
    }

    if (dateKey === toDateKey(today)) dayButton.classList.add("calendar-day--today");
    if (dateKey === selectedDate) cell.classList.add("calendar-grid__cell--selected");

    dayButton.addEventListener("click", () => {
      selectedDate = dateKey;
      renderCalendar();
      showEventsForSelectedDate();
    });

    cell.append(dayButton);
    gridElement.append(cell);
  }

  showEventsForSelectedDate();
}

document.querySelector("#previous-month").addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#next-month").addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
  renderCalendar();
});

fetch("events.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Le fichier events.json répond avec le statut ${response.status}.`);
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) throw new Error("Le fichier events.json doit contenir une liste d’événements.");
    events = data
      .filter((event) =>
        event &&
        typeof event.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
        typeof event.title === "string" &&
        event.title.trim()
      )
      .map((event) => ({
        date: event.date,
        title: event.title.trim(),
        time: typeof event.time === "string" ? event.time : "",
        location: typeof event.location === "string" ? event.location : "",
        description: typeof event.description === "string" ? event.description : ""
      }))
      .sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time));
    renderCalendar();
  })
  .catch((error) => {
    showStatus(`Impossible de charger le calendrier : ${error.message}`);
    renderCalendar();
  });
