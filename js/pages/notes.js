import { KEYS, readJson, writeJson } from '../core/01-storage.js';
import { clearSharedSelectedDate } from '../core/06-session.js';

const titleInput = document.querySelector('#note-title');
const editor = document.querySelector('#note-editor');
const saveState = document.querySelector('#note-save-state');
let saveTimer = null;

init();

function init() {
  clearSharedSelectedDate();
  const note = readJson(KEYS.NOTE, { title: '', html: '', updatedAt: null });
  titleInput.value = note.title || '';
  editor.innerHTML = note.html || '';

  titleInput.addEventListener('input', scheduleSave);
  editor.addEventListener('input', scheduleSave);

  document.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('click', () => {
      editor.focus();
      const command = button.dataset.command;
      const value = button.dataset.value || null;
      document.execCommand(command, false, value);
      scheduleSave();
    });
  });
}

function scheduleSave() {
  saveState.textContent = 'Đang lưu…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 450);
}

function saveNow() {
  writeJson(KEYS.NOTE, {
    title: titleInput.value,
    html: editor.innerHTML,
    updatedAt: Date.now()
  });
  saveState.textContent = 'Đã tự lưu trên máy';
}