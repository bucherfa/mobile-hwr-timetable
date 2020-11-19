const BASE_URL = 'https://ipool.lehre.hwr-berlin.de/api/timetable/v1/data/';
const LOCALSTORAGE_KEY_PREFERENCES = '__timetable_preferences';
const LOCALSTORAGE_KEY_CALENDAR = '__timetable_calendar';
let preferences;

function build() {
  preferences = localStorage.getItem(LOCALSTORAGE_KEY_PREFERENCES) || {
    baseUrl: BASE_URL,
    course: null,
    ignored: []
  };
  if (typeof preferences === 'string') {
    preferences = JSON.parse(preferences);
  }
  if (!preferences.course) {
    preferences.course = window.prompt('Enter your course name such as informatik/semester1/kursa:');
    console.log(preferences)
    localStorage.setItem(LOCALSTORAGE_KEY_PREFERENCES, JSON.stringify(preferences));
  }
  refreshCalendar();
}

function refreshCalendar() {
  startLoading();
  getCalendar(preferences.baseUrl + preferences.course, (calendar, error) => {
    if (error) {
      console.log(error);
      window.alert('Something went wrong!')
      stopLoading();
      return;
    }
    localStorage.setItem(LOCALSTORAGE_KEY_CALENDAR, JSON.stringify(calendar));
    rebuildCalendar(calendar.events)
    stopLoading();
  })
}

function rebuildCalendar(events) {
  const daysElement = document.querySelector('.days');
  if (daysElement) {
    daysElement.remove();
  }
  document.querySelector('.main').append(buildDays(events));
}

function getCalendar(url, callback) {
  fetch(url)
    .then(response => response.text()).then(ics => {
      const icsEvents = ics.split('BEGIN:VEVENT\r\n');
      icsEvents.shift();
      const calendar = {};
      if (icsEvents.length > 0) {
        const dateTime = icsEvents[0].split('DTSTAMP:')[1].split('Z')[0].split('T');
        const date = getDateFormatted(dateTime[0]);
        const time = getTimeFormatted(dateTime[1]);
        calendar._updated = `${date} ${time}`;
      }
      const events = {};
      for (const icsEventString of icsEvents) {
        const event = parseEvent(icsEventString);
        const date = event.date;
        if (!events[date]) {
          events[date] = [];
        }
        events[date].push(event);
      }
      calendar.events = sortObject(events);
      callback(calendar, null);
    })
    .catch(reason => callback(null, reason))
}

function getTimeFormatted(string) {
  if (string.length > 4) {
    return string.slice(0, 2) + ':' + string.slice(2, 4) + ':' + string.slice(4);
  }
  return string.slice(0, 2) + ':' + string.slice(2);
}

function getDateFormatted(string) {
  return string.slice(0, 4) + '-' + string.slice(4, 6) + '-' + string.slice(6);
}

function sortObject(object) {
  return Object.keys(object).sort().reduce(function (result, key) {
    result[key] = object[key];
    return result;
  }, {});
}

function parseEvent(icsEventString) {
  const icsEventDirty = icsEventString.split('\r\n');
  const icsEvent = [];
  for (const item of icsEventDirty) {
    const length = icsEvent.length;
    if (item.startsWith(' ') && length > 0) {
      icsEvent[length - 1] += item.substring(1);
    } else {
      icsEvent.push(item);
    }
  }
  const event = {};
  const startDateTimeArray = icsEvent[1].split(':')[1].split('T');
  event.date = getDateFormatted(startDateTimeArray[0]);
  event.start = getTimeFormatted(startDateTimeArray[1].slice(0, 4));
  event.end = getTimeFormatted(icsEvent[2].split(':')[1].split('T')[1].slice(0, 4));
  const description = icsEvent[7].split('\\n').map(item => item.split(': ').slice(1).join(': ').replaceAll('\\', ''));
  event.type = description[0];
  event.name = description[1];
  event.lecturer = description[2];
  event.location = description[3];
  event.note = description[4];
  event.break = description[5];
  event.subcategory = description[6];
  return event;
}

function buildDays(days) {
  const root = document.createElement('div');
  root.classList.add('days');
  const today = todayString();
  for (const dayString of Object.keys(days)) {
    const events = days[dayString];
    if (dayString >= today) {
      const day = document.createElement('div');
      day.classList.add('day');
      root.appendChild(day);
      const dateElement = document.createElement('div');
      dateElement.innerText = new Date(dayString).toLocaleString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      dateElement.classList.add('day__date');
      day.appendChild(dateElement);
      const eventsElement = document.createElement('div');
      day.appendChild(eventsElement);
      for (const event of events) {
        const eventElement = document.createElement('div');
        eventElement.innerText = event.name;
        eventElement.classList.add('day__event');
        eventsElement.appendChild(eventElement);
      }
    }
  }
  return root;
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function startLoading() {
  document.querySelector('.loading').classList.remove('loading--hidden')
}

function stopLoading() {
  document.querySelector('.loading').classList.add('loading--hidden')
}
