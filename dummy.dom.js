// minimum dependencies to make the code run on node
globalThis.requestAnimationFrame = queueMicrotask;
globalThis.document = {
    body: {appendChild(){}},
    documentElement: {
        classList: {add(){}}
    },
    createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
            fillStyle: '',
            fillRect() {}
        })
    })
};
