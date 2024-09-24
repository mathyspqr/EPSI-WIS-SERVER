"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const todos = [
    {
        todoId: 1,
        text: "fetch loaded data from vue frontend app ",
        done: true,
    },
    {
        todoId: 2,
        text: "display those todos inside my app",
        done: true,
    },
    {
        todoId: 3,
        text: "develop methods to update my json db of todos",
        done: false,
    },
    {
        todoId: 4,
        text: "watch mutation of mesTodos to automatically update todos",
        done: false,
    },
];
// on créé une instance d'une application Express
const app = (0, express_1.default)();
// on précise à l'application qu'elle doit parser le body des requêtes en JSON (utilisation d'un middleware)
app.use(express_1.default.json());
// on peut utiliser app.get, app.post, app.put, app.delete, etc.. ()
// on définit une route GET /todos, et la fonction qui s'exécute lorsque le serveur reçoit une requête qui matche
app.get("/todos", (request, result) => {
    console.log(`route "/todos" called`);
    return result.status(200).json(todos);
});
// une autre route pour récupérer 1 TODO
app.get("/todos/:id", (request, result) => {
    console.log(`route "/todos/:id" called`);
    console.log(`params of the request : ${JSON.stringify(request.params)}`);
    return result
        .status(200)
        .json(todos.find((todo) => todo.todoId === Number(request.params.id)) || null);
});
// une autre route pour mettre a jour
app.put("/todoedit/:id", (request, result) => {
    console.log(`route "/todoedit/:id" called`);
    console.log(`params of the request : ${JSON.stringify(request.params)}`);
    const todoId = Number(request.params.id);
    const todoIndex = todos.findIndex((todo) => todo.todoId === todoId);
    if (todoIndex == -1) {
        return result.status(404).json({ message: "todo not found" });
    }
    todos[todoIndex] = Object.assign(Object.assign({}, todos[todoIndex]), request.body);
    return result
        .status(200)
        .json(todos[todoIndex]);
});
// une autre route pour en ajouter
app.post("/createtodo", (request, result) => {
    console.log(`route "/todos" called for creating a new todo`);
    const newTodo = {
        todoId: todos.length + 1,
        text: request.body.text,
        done: false,
    };
    todos.push(newTodo);
    return result.status(201).json(newTodo);
});
app.listen(8080, () => console.log("server started, listening on port 8080"));
