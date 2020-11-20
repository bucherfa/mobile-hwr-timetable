const BASE_URL = 'https://ipool.lehre.hwr-berlin.de/api/timetable/v1/data/';
const LOCALSTORAGE_KEY_COURSE = '__timetable_course';
const LOCALSTORAGE_KEY_CALENDAR = '__timetable_calendar';
let localStorageCourse;
let currentCourse;
let courseFromUrl;

function build() {
  localStorageCourse = localStorage.getItem(LOCALSTORAGE_KEY_COURSE);
  courseFromUrl = getCourseFromUrl();
  currentCourse = courseFromUrl || localStorageCourse;
  refreshCalendar();
}

function refreshCalendar() {
  startLoading();
  getCalendar(`${BASE_URL}${currentCourse}`, (calendar, error) => {
    if (error) {
      console.log(error);
      window.alert('Something went wrong!') // TODO offline notification or invalid input
      const oldVersion = localStorage.getItem(LOCALSTORAGE_KEY_CALENDAR);
      if (oldVersion) {
        const calendar = JSON.parse(oldVersion);
        rebuildCalendar(calendar.events);
        setMetadata(calendar);
        // TODO old version restored info
      }
      stopLoading();
      return;
    }
    // set default course if no course is already set
    if (!localStorageCourse && currentCourse) {
      localStorage.setItem(LOCALSTORAGE_KEY_COURSE, currentCourse);
    }
    if (localStorageCourse && courseFromUrl && courseFromUrl !== localStorageCourse) {
      // TODO offer user to update default course to course from url
    }
    localStorage.setItem(LOCALSTORAGE_KEY_CALENDAR, JSON.stringify(calendar));
    rebuildCalendar(calendar.events);
    setMetadata(calendar);
    stopLoading();
  })
}

function setMetadata(calendar) {
  document.querySelector('.version--js').innerText = `Version vom ${calendar._updated}`;
  document.querySelector('.course--js').innerText = ` | ${currentCourse}`;
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
    result[key] = object[key].sort((a, b) => { if (a.start < b.start) { return -1 } if (a.start > b.start) { return 1 } return 0; });
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
  event.type = description[0]; //TODO
  event.name = description[1];
  if (/^[A-Z0-9]{3,}-/.test(description[1])) {
    const nameArray = description[1].split('-')
    event.id = nameArray.shift();
    event.name = nameArray.join('-');
  }
  event.lecturer = description[2]; //TODO
  event.location = description[3]; //TODO
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
        let main = `<span class="event__detail">${event.name}</span>`;
        if (event.id) {
          main = `${main} <small class="event__detail event__detail--secondary">(${event.id})</small>`;
        }
        if (event.type !== '-') {
          main = `${main} ⋅ <span class="event__detail">${event.type}</span>`;
        }
        if (event.location !== '-') {
          main = `${main} ⋅ <span class="event__detail">${event.location}</span>`;
        }
        if (event.lecturer !== '-') {
          main = `${main} ⋅ <span class="event__detail">${event.lecturer}</span>`;
        }
        eventElement.innerHTML = `
        <div class="event__time">
          <small>${event.start}</small>
          <small>${event.end}</small>
        </div>
        <div class="event__main">
          <div>${main}</div>
          <small class="event__note">${event.note === '-' ? '' : event.note}</small>
        </div>
        `;
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

function getCourseFromUrl() {
  let course = location.search.substr(1);
  if (course) {
    if (course.startsWith(BASE_URL)) {
      course = course.split(BASE_URL)[1];
    }
    if (course.startsWith('/')) {
      course = course.slice(1);
    }
  }
  return course;
}
