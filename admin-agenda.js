const form = document.querySelector("#event-form");
const eventIdInput = document.querySelector("#event-id");
const eventDateInput = document.querySelector("#event-date");
const eventTitleInput = document.querySelector("#event-title");
const eventTimeInput = document.querySelector("#event-time");
const eventLocationInput = document.querySelector("#event-location");
const eventDescriptionInput = document.querySelector("#event-description");
const eventList = document.querySelector("#admin-event-list");
const adminStatus = document.querySelector("#admin-status");
const submitButton = document.querySelector("#submit-event");
const cancelButton = document.querySelector("#cancel-edit");
const eventsFileName = "events.json";
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});
let events = [];

function showAdminStatus(message) {
  adminStatus.textContent = message;
}

function makeEventId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatEventDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function resetForm() {
  form.reset();
  eventIdInput.value = "";
  submitButton.textContent = "Ajouter l’événement";
  cancelButton.hidden = true;
}

function createDetail(event) {
  const detail = [formatEventDate(event.date), event.time, event.location]
    .filter(Boolean)
    .join(" · ");
  const paragraph = document.createElement("p");
  paragraph.className = "admin-event__details";
  paragraph.textContent = detail;
  return paragraph;
}

function renderEvents() {
  eventList.replaceChildren();

  if (!events.length) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "admin-event-list__empty";
    emptyMessage.textContent = "Aucun événement pour le moment.";
    eventList.append(emptyMessage);
    return;
  }

  const sortedEvents = [...events].sort((first, second) =>
    first.date.localeCompare(second.date) || first.time.localeCompare(second.time)
  );

  for (const event of sortedEvents) {
    const item = document.createElement("li");
    item.className = "admin-event";

    const details = document.createElement("div");
    details.className = "admin-event__content";

    const title = document.createElement("h3");
    title.textContent = event.title;
    details.append(title, createDetail(event));

    if (event.description) {
      const description = document.createElement("p");
      description.className = "admin-event__description";
      description.textContent = event.description;
      details.append(description);
    }

    const actions = document.createElement("div");
    actions.className = "admin-event__actions";

    const edit = document.createElement("button");
    edit.className = "calendar-button calendar-button--secondary";
    edit.type = "button";
    edit.textContent = "Modifier";
    edit.setAttribute("aria-label", `Modifier ${event.title}`);
    edit.addEventListener("click", () => {
      eventIdInput.value = event.id;
      eventDateInput.value = event.date;
      eventTitleInput.value = event.title;
      eventTimeInput.value = event.time;
      eventLocationInput.value = event.location;
      eventDescriptionInput.value = event.description;
      submitButton.textContent = "Enregistrer";
      cancelButton.hidden = false;
      eventTitleInput.focus();
    });

    const remove = document.createElement("button");
    remove.className = "calendar-button calendar-button--danger";
    remove.type = "button";
    remove.textContent = "Supprimer";
    remove.setAttribute("aria-label", `Supprimer ${event.title}`);
    remove.addEventListener("click", () => {
      events = events.filter((itemToKeep) => itemToKeep.id !== event.id);
      renderEvents();
      showAdminStatus("Événement supprimé. Télécharge events.json pour publier la modification.");
      if (eventIdInput.value === event.id) resetForm();
    });

    actions.append(edit, remove);
    item.append(details, actions);
    eventList.append(item);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const id = eventIdInput.value || makeEventId();
  const updatedEvent = {
    id,
    date: eventDateInput.value,
    title: eventTitleInput.value.trim(),
    time: eventTimeInput.value,
    location: eventLocationInput.value.trim(),
    description: eventDescriptionInput.value.trim()
  };
  const existingIndex = events.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    events.push(updatedEvent);
    showAdminStatus("Événement ajouté. Télécharge events.json pour publier la modification.");
  } else {
    events[existingIndex] = updatedEvent;
    showAdminStatus("Événement modifié. Télécharge events.json pour publier la modification.");
  }

  resetForm();
  renderEvents();
});

cancelButton.addEventListener("click", resetForm);

document.querySelector("#download-events").addEventListener("click", () => {
  const content = `${JSON.stringify(events, null, 2)}\n`;
  const file = new Blob([content], { type: "application/json;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = eventsFileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  showAdminStatus("Fichier téléchargé. Remplace events.json dans le dossier du site puis republie-le pour partager les changements.");
});

fetch(eventsFileName, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Le fichier ${eventsFileName} répond avec le statut ${response.status}.`);
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) throw new Error(`${eventsFileName} doit contenir une liste d’événements.`);
    events = data
      .filter((event) =>
        event &&
        typeof event.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
        typeof event.title === "string" &&
        event.title.trim()
      )
      .map((event) => ({
        id: typeof event.id === "string" ? event.id : makeEventId(),
        date: event.date,
        title: event.title.trim(),
        time: typeof event.time === "string" ? event.time : "",
        location: typeof event.location === "string" ? event.location : "",
        description: typeof event.description === "string" ? event.description : ""
      }));
    renderEvents();
  })
  .catch((error) => {
    showAdminStatus(`Impossible de charger les événements : ${error.message}`);
    renderEvents();
  });
