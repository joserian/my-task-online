import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, push, get, onValue, update, remove, onChildChanged, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { firebaseConfig } from "./apiKey.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

//chat config
const chatIcon = document.getElementById("chat-icon");

chatIcon.addEventListener("click", () => {
    const chat = chatIcon.parentElement;
    if(chat.className == "expanded") {
        chatIcon.querySelector("span").innerHTML = "forum";
        chat.classList.remove("expanded");
    }else {
        chatIcon.querySelector("span").innerHTML = "close";
        chat.classList.add("expanded");
    }
});

function getCurrentHour() {
    const date = new Date();

    var hours = date.getHours();
    var minutes = date.getMinutes();

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${minutes}`;
}

const inputMessage = document.getElementById("input-message");

function insertDatabaseMessage() {
    set(
        push(ref(database, "messages/")),
        {
            username: document.getElementById("username").value,
            message: inputMessage.innerHTML,
            hour: getCurrentHour()
        }
    );
}

function insertMessage(user, message, hour) {
    const messages = document.getElementById("messages");
    
    const model = 
    `<div class="message-container">
        <div class="user">${user == "" ? "anônimo" : user} (${hour})</div>
        <div class="message">${message}</div>
    </div>`;
    
    messages.innerHTML += model;

    messages.scrollTop = messages.scrollHeight;
}

inputMessage.addEventListener("keydown", (e) => {
    if(e.key == "Enter" && (inputMessage.textContent != "" || inputMessage.querySelector("img"))) {
        e.preventDefault();
        insertDatabaseMessage();
        inputMessage.innerHTML = "";
    }
});

const send = document.getElementById("send-icon");

send.addEventListener("click", () => {
    if(inputMessage.textContent != "" || inputMessage.querySelector("img")) {
        insertDatabaseMessage();        
        inputMessage.innerHTML = "";
    }
});

onChildAdded(ref(database, "messages/"), snapshot => {
    const val = snapshot.val();
    insertMessage(val.username, val.message, val.hour);
});

onValue(ref(database, "messages/"), (snapshot) => {
    if(!snapshot.val()) return;

    if(Object.keys(snapshot.val()).length > 30) {
        get(ref(database, "messages/")).then(snapshot => {
            if(snapshot.exists()) {
                const val = Object.keys(snapshot.val());
    
                remove(ref(database, "messages/" + val[0]))
            }
        })
    }
});

const chatUsername = document.querySelector("#username");
chatUsername.value = localStorage.getItem("username")??"";

chatUsername.addEventListener("blur", () => {
    localStorage.setItem("username", chatUsername.value);
});

//tasks config
var taskFocus = undefined;
var boardFocus = undefined;
var taskDragged = undefined;

var iCreatedTask = false;
// var iJustCreated = false;

//add button
const add = document.querySelectorAll(".add");

for(var i = 0; i < add.length; i++) {
    const instance = add[i];
    const board = instance.classList[1];

    instance.addEventListener("click", () => {
        //adicionando uma tarefa ao banco de dados

        //adiciona ao banco tasks um novo item automaticamente
        const reff = push(ref(database,  "boards/" + board + "/tasks")); 
        
        iCreatedTask = true;
        
        //dentro desse item criado, vamos adicionar caracteristicas da nossa task
        set(reff, 
        {
            id: reff.key,
            content: ""
        });

    })
}

//remove button
const removeButton = document.querySelectorAll(".remove");

for(var i = 0; i < removeButton.length; i++) {
    const instance = removeButton[i];
    const board = instance.classList[1];

    instance.addEventListener("click", () => {
        if(taskFocus == undefined) return

        logRemoveTask().then(resolve => {
            if(resolve) {
                removeFromDatabase(board, taskFocus.id);
                taskFocus = undefined;
            }
        }).finally(() => {
            document.querySelector("#log").remove();
            document.querySelector("#fade").remove();
        })
    });
}

function logRemoveTask() {

    const fade = document.createElement("div");
    fade.id = "fade";

    document.body.appendChild(fade);

    const content = taskFocus.querySelector("p[contenteditable='true']").innerHTML;

    const log = document.createElement("div");
    log.id = "log";

    const taskLog = document.createElement("div");
    taskLog.className = "task-log";

    const p = document.createElement("p");
    p.innerHTML = content;

    taskLog.appendChild(p);
    log.appendChild(taskLog);

    const options = document.createElement("div");
    options.id = "options";
    
    const message = document.createElement("div");
    message.id = "message";
    message.innerHTML = "Tem certeza que deseja excluir essa tarefa?";

    options.appendChild(message);

    const buttons = document.createElement("div");
    buttons.id = "buttons";

    const no = document.createElement("button");
    no.id = "no";
    no.innerHTML = "Não";

    const yes = document.createElement("button");
    yes.id = "yes";
    yes.innerHTML = "Sim";

    buttons.appendChild(no);
    buttons.appendChild(yes);

    options.appendChild(buttons);

    log.appendChild(options)

    document.body.appendChild(log);
    
    return new Promise((resolve) => {

        no.addEventListener("click", () => {
            resolve(false)
        });
    
        yes.addEventListener("click", () => {
            resolve(true);
        })
    })

}

function removeFromDatabase(board, id) {
    get(ref(database, `boards/${board}/tasks/${id}`)).then(snapshot => {
        if(snapshot.exists) {
            const val = snapshot.val();

            if(val.content != "") set(ref(database, `boards/tasks-removed/${id}`), val);
            remove(ref(database, `boards/${board}/tasks/${id}`));
        }
    })
}

//boards config
const boards = document.querySelectorAll(".board");

for(var i = 0; i < boards.length; i++) {
    const instance = boards[i];
    const board = instance.classList[1];
    const tasks = instance.querySelector(".tasks");

    //configurações de drag and drop
    tasks.addEventListener("dragenter", (e) => {
        if(boardFocus != tasks) {
            if(boardFocus != undefined) {
                boardFocus.classList.remove("light");
            }
            boardFocus = tasks;
            tasks.classList.add("light");
        }
    });

    tasks.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    tasks.addEventListener("drop", (e) => {
        boardFocus.classList.remove("light");
        boardFocus = undefined;

        const sameBoard = () => {
            if(e.target.tagName == "P") {
                return true;
            }
            var equal = false;

            tasks.classList.forEach(item => {
                if(item == taskDragged.fromBoard) {
                    equal = true;
                    return
                }
            });

            if(equal) return true;

            return false;
        };
        
        if(sameBoard()) return

        e.preventDefault();

        const fromRef = ref(database, `boards/${taskDragged.fromBoard}/tasks/${taskDragged.id}`); 
        get(fromRef).then(snapshot => {
            if(snapshot.exists) {
                const val = snapshot.val();
                set(ref(database, `boards/${board}/tasks/${taskDragged.id}`), val);
                remove(fromRef);
            }
        })
    })

    if(!document.body.querySelector("#fade")) {
        const fade = document.createElement("div");
        fade.id = "fade";

        const load = document.createElement("div");
        load.id = "loading-icon";

        fade.appendChild(load);

        document.body.appendChild(fade);
    }

    var updates = 0;

    const tasksRef = ref(database, `boards/${board}/tasks`);

    onValue(tasksRef, () => {
        updates++;

        const fade = document.querySelector("#fade");

        if(fade && updates >= boards.length) {
            fade.remove()
        }
    })

    //quando uma nova tarefa é adicionada
    onChildAdded(tasksRef, (snapshot) => {
        const val = snapshot.val();
        const taskExists = tasks.querySelector(`#${snapshot.key}`);

        if (!taskExists) {
            const task = document.createElement("div");
            task.className = "task";
            task.id = val.id;
            task.draggable = true;

            const taskText = document.createElement("p");
            taskText.contentEditable = "true";
            taskText.innerHTML = val.content;

            task.appendChild(taskText);

            task.addEventListener("dragstart", () => {
                taskDragged = {
                    id: task.id,
                    fromBoard: board
                };
            });

            task.addEventListener("dragend", () => {
                if (boardFocus != undefined) {
                    boardFocus.classList.remove("light");
                    boardFocus = undefined;
                }
            });

            taskText.addEventListener("focus", (e) => {
                task.draggable = false;
                taskFocus = e.target.parentElement;
            });

            taskText.addEventListener("blur", (e) => {
                task.draggable = true;
                const content = e.target.innerHTML;


                // if(taskText.innerHTML == "Digite sua tarefa aqui" && iJustCreated) {
                //     removeFromDatabase(board, task.id)
                //     return;
                // }

                update(ref(database, `boards/${board}/tasks/` + task.id), {
                    content: content
                });
            });

            taskText.addEventListener("keydown", (e) => {
                if(e.key == "Escape") {
                    taskText.blur();
                }
                // if(iJustCreated) {
                //     taskText.innerHTML = "";
                //     iJustCreated = false;
                // }
                
            })

            tasks.appendChild(task);

            //focar a nova tarefa
            if(iCreatedTask) {
                taskText.focus();
                taskText.innerHTML = "Nome (Titulo):";
                // iJustCreated = true;
                iCreatedTask = false;
            }
        }
    });
        

    //quando uma tarefa existente é alterada
    onChildChanged(tasksRef, (snapshot) => {
        const taskEditable = tasks.querySelector(`#${snapshot.key} p[contenteditable='true']`);

        if (taskEditable && taskEditable.innerHTML !== snapshot.val().content) {
            taskEditable.innerHTML = snapshot.val().content;
        }

        const titleBoard = instance.querySelector(".title-board");
        var spanUpdateTask = titleBoard.querySelector("span");

        if(spanUpdateTask) {
            spanUpdateTask.remove();
        }

        spanUpdateTask = document.createElement("span");
        spanUpdateTask.innerHTML = "As alterações foram salvas!";

        titleBoard.appendChild(spanUpdateTask);

        setTimeout(() => {
            spanUpdateTask.remove();
            
        }, 2000);
    });

    //quando uma tarefa é removida
    onChildRemoved(tasksRef, (snapshot) => {
        const task = tasks.querySelector(`#${snapshot.key}`);
        if (task) {
            task.remove();
        }
    });
}

const messagesContainer = document.getElementById('messages-container');
const emojiButton = document.getElementById('emoji-button');
const emojiMenu = document.getElementById('emoji-menu');

// Emojis adicionais
const emojis = [
   "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",  "😊", "😇", 
    "😐", "😑", "😒", "🙄", "😬",  "😱", "😨", "😰", "😥", "😓",
    "😤", "😡",  "😩", "😖", "😤", "😠",
    "😍", "❤️", "😘", "😗", "😙", "😚", "😋", "😜", "😝", "😛"
]

// Alternar visibilidade do chat
chatIcon.addEventListener('click', () => {
    messagesContainer.style.display = messagesContainer.style.display === 'flex' ? 'none' : 'flex'
});

// Alternar visibilidade do menu de emojis
emojiButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Impede que o clique feche o menu imediatamente
    emojiMenu.style.display = emojiMenu.style.display === 'block' ? 'none' : 'block'
})

// Adicionar emojis ao menu de emojis
emojis.forEach(emoji => {
    const emojiSpan = document.createElement('span')
    emojiSpan.textContent = emoji;
    emojiMenu.appendChild(emojiSpan);
});

// Inserir emoji no campo de entrada
emojiMenu.addEventListener('click', (event) => {
    if (event.target.tagName === 'SPAN') {
        const emoji = event.target.textContent;

        // Inserir emoji no campo contenteditable
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        
        if (selection.isCollapsed) {
            range.setStart(inputMessage, inputMessage.childNodes.length);
        }

        range.deleteContents();
        const textNode = document.createTextNode(emoji);
        range.insertNode(textNode);

       
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)

        selection.removeAllRanges()
        selection.addRange(range)

        emojiMenu.style.display = 'none'
    }
});

// Fechar o menu de emojis ao clicar fora
document.addEventListener('click', (event) => {
    if (!emojiMenu.contains(event.target) && !emojiButton.contains(event.target)) {
        emojiMenu.style.display = 'none'
    }
});
