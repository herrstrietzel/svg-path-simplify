window.addEventListener("DOMContentLoaded", (e) => {
    initZoomEls();
});

function initZoomEls() {
    let els = document.querySelectorAll("[data-zoom]");

    els.forEach((el) => {

        addElZoomoStyles();

        el.classList.add("elzoomo-el");
        let options = JSON.parse(el.dataset.zoom);
        initZoomEl(el, options);

        let bb0 = el.closest("[data-zoom]").getBoundingClientRect()

        let child = el.children[0]
        let bb = child.getBoundingClientRect();


        let { x, y, width, height } = bb;

        let offsetY = bb0.height - height;
        //let offY = y+height*0.5 - height * scale * 0.5
        //let offY = y + bb.height * scale * 0.5
        //let dimMax = Math.max()
        let scale = bb.width / bb0.width

        /*
        let offX = x - offsetX*0.5
         offX = width*scale*0.25
         offX = x - offsetX * 1;
         offX= x*1 - offsetX + (x+offsetX)*0.5
        */
        let diffW = (bb0.width - bb.width) * scale;
        let offX = diffW * 0.5
       // offX = bb.x * scale * 0.5
        offX=0
        //offX=diffW

       // console.log(bb0, bb, 'diffW', diffW, 'scale', scale, 'offX', offX);


        let offY = y + offsetY * 0.5

        //let mtx0 = { a: 1, b: 0, c: 0, d: 1, e: offX, f: offY };
        let mtx0 = { a: scale, b: 0, c: 0, d: scale, e: offX, f: offY };
        el.style.transform = `matrix(${Object.values(mtx0).join(', ')})`
        el.style.setProperty('--zoomScale', mtx0.a)

    });
}

// add style
function addElZoomoStyles() {
    let styleEl = document.getElementById("elzoomoStyle");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent = `
            .elzoomo{
                position:relative;
                overflow:hidden;
                line-height:0px;
            }
    
            .elzoomo-toolbar{
                position:absolute;
                left:1rem;
                top:1rem;
                display:flex;
                flex-direction:column;
                gap:0rem;
                border-radius:0.25rem;
                outline: 2px solid var(--color-text, #000);
            }
    
            .elzoomo-btn{
                appearance:none;
                border:none;
                line-height:0em;
                font-size:24px;
                width:1em;
                height:1em;
                background-color:rgba(255,255,255,0.5);
                font-weight:700;
                text-align:center;
                cursor:pointer;
                padding:0;
                margin:0;
                color: currentColor;
            }
    
            .elzoomo-el:hover{
                cursor:move;
            }`;
        document.head.append(styleEl);
    }
}


function initZoomEl(el, options) {

    // wrap if necessary
    let container = el.closest(".elzoomo");

    if (!container) {
        container = document.createElement("div");
        el.parentNode.insertBefore(container, el);
        container.classList.add("elzoomo");
        container.append(el);
    }


    const getCurrentTransforms = (el) => {
        return new DOMMatrix(el.style.transform);
    };

    const setTransforms = (el, mtx) => {
        el.style.transform = `matrix(${Object.values(mtx).join(", ")})`;
        el.style.setProperty('--zoomScale', mtx.a)
    };

    // initial scale
    if (options.zoom != 1) {
        let mtx = { a: options.zoom, b: 0, c: 0, d: options.zoom, e: 0, f: 0 };
        setTransforms(el, mtx);
    } else {

    }



    options = {
        ...{
            minScale: 1,
            maxScale: 10,
            zoom: 1,
            zoomStep: 1.001,
            scaleStroke: false,
            toolbar: true
        },
        ...options
    };

    // get original strokeWidth
    let strokeWidth = parseFloat(window.getComputedStyle(el).strokeWidth);

    /**
     * add zoom buttons
     */

    let btnZoomIn = null;
    let btnZoomOut = null;

    if (options.toolbar) {
        let toolbar = `<div class="elzoomo-toolbar">
            <button type="button" class="elzoomo-btn elzoomo-btn-zoomin" title="zoom in">+</button>
            <button type="button" class="elzoomo-btn elzoomo-btn-zoomout" title="zoom out">&minus;</button>
        </div>`;

        container.insertAdjacentHTML("beforeend", toolbar);

        btnZoomIn = container.querySelector(".elzoomo-btn-zoomin")
        btnZoomOut = container.querySelector(".elzoomo-btn-zoomout")

    } else {

        if (!btnZoomIn) {
            btnZoomIn = document.body.querySelector(".elzoomo-btn-zoomin");
        }
        if (!btnZoomOut) {
            btnZoomOut = document.body.querySelector(".elzoomo-btn-zoomout");
        }
    }

    if (btnZoomIn && btnZoomOut) {

        btnZoomIn.addEventListener("click", (e) => {
            e.deltaY = -100;
            zoom(e);
        });

        btnZoomOut.addEventListener("click", (e) => {
            e.deltaY = 100;
            zoom(e);
        });
    }


    /**
     * Zoom:
     * update scale values
     */
    const updateScale = (
        mtx,
        e,
        newScale,
        minScale,
        maxScale,
    ) => {
        let clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        let scale = clamp(newScale, minScale || 1, maxScale || 10);
        //let el = e.currentTarget.firstElementChild;
        //let el = e.currentTarget.closest(".elzoomo").firstElementChild;
        let el = document.querySelector(".elzoomo").firstElementChild;
        //console.log(e.currentTarget);

        let [prevScale, translateX, translateY] = [mtx.a, mtx.e, mtx.f];

        if (scale === prevScale) return mtx;

        let scaleRatio = scale / prevScale - 1;
        let { left, top, width, height } = el.getBoundingClientRect();

        let cx = (e?.clientX || 0) - left - width / 2;
        let cy = (e?.clientY || 0) - top - height / 2;

        translateX = translateX - scaleRatio * cx;
        translateY = translateY - scaleRatio * cy;

        // update matrix
        mtx = { a: scale, b: 0, c: 0, d: scale, e: translateX, f: translateY };
        return mtx;
    };

    /**
     * Pan:
     * update translate values
     */
    const updateTranslate = (mtx, dx, dy) => {
        let [scale, translateX, translateY] = [mtx.a, mtx.e, mtx.f];
        // update matrix
        mtx = {
            a: scale,
            b: 0,
            c: 0,
            d: scale,
            e: translateX - dx,
            f: translateY - dy
        };
        return mtx;
    };

    /**
     * pan and
     * zoom processing
     */

    const pan = (e) => {
        let { dx, dy } = e.detail;
        let el = e.currentTarget.firstElementChild;
        let m = getCurrentTransforms(el);
        let mtxNew = updateTranslate(m, -dx, -dy);
        setTransforms(el, mtxNew);
    };

    const zoom = (e) => {
        let { zoomStep, minScale, maxScale, snapToOrigin, scaleStroke } = options;
        let zoomFactor = zoomStep ** -e.deltaY || 1;
        //let el = e.currentTarget.closest(".elzoomo").firstElementChild;
        let el = document.querySelector(".elzoomo").firstElementChild;

        // get current matrix
        let m = getCurrentTransforms(el);

        let scaleNew = m.a * zoomFactor;

        // update scaling
        let mtxNew = updateScale(m, e, scaleNew, minScale, maxScale, snapToOrigin);

        if (scaleStroke) {
            el.style.strokeWidth = strokeWidth * (1 / scaleNew) + "px";
        }

        // apply transforms
        setTransforms(el, mtxNew);
        e.preventDefault();
    };

    /**
     * custom events
     */
    const addDragInputListener = (el) => {
        function dispatchDragInput(type, originalEvent, data) {
            let dragEvent = new CustomEvent("dragInput", {
                bubbles: true,
                detail: {
                    type,
                    originalEvent,
                    ...data
                }
            });
            el.dispatchEvent(dragEvent);
        }

        const onStart = (e) => {
            e.preventDefault();
            if (e.type === "touchstart" && e.touches.length > 1) return;

            let isTouch = e.type === "touchstart";
            let pt = isTouch ? e.touches[0] : e;
            let lastX = pt.clientX;
            let lastY = pt.clientY;

            const onMove = (e) => {
                if (isTouch && e.touches.length > 1) return;
                let ptMove = isTouch ? e.touches[0] : e;
                let dx = ptMove.clientX - lastX;
                let dy = ptMove.clientY - lastY;

                dispatchDragInput("move", e, {
                    clientX: ptMove.clientX,
                    clientY: ptMove.clientY,
                    dx,
                    dy
                });

                lastX = ptMove.clientX;
                lastY = ptMove.clientY;
            };

            const onEnd = (e) => {
                dispatchDragInput("end", e, {});
                window.removeEventListener(isTouch ? "touchmove" : "mousemove", onMove);
                window.removeEventListener(isTouch ? "touchend" : "mouseup", onEnd);
            };

            window.addEventListener(isTouch ? "touchmove" : "mousemove", onMove, {
                passive: false
            });
            window.addEventListener(isTouch ? "touchend" : "mouseup", onEnd);

            dispatchDragInput("start", e, {
                clientX: pt.clientX,
                clientY: pt.clientY,
                dx: 0,
                dy: 0
            });
        };

        el.addEventListener("mousedown", onStart);
        el.addEventListener("touchstart", onStart, { passive: false });



        /*
        setTimeout(()=>{
            let child = el.children[0]
            let rect = child.getBoundingClientRect();
            console.log(rect, el);
            let mtx0 = { a: options.zoom, b: 0, c: 0, d: options.zoom, e: 0, f: rect.top };
            setTransforms(child, mtx0);

        },1000)
        */



    };

    // Enable normalized drag events
    addDragInputListener(container);

    // pinch zoom event
    const addPinchZoomListener = (el) => {
        let prevDistance = null;
        //let lastCenter = { x: 0, y: 0 };

        const onTouchMove = (e) => {
            e.preventDefault();
            // prevent pinch
            if (e.touches.length !== 2) return;

            let touches = e.touches;
            let dx = touches[0].clientX - touches[1].clientX;
            let dy = touches[0].clientY - touches[1].clientY;
            let distance = Math.hypot(dx, dy);

            if (prevDistance !== null) {
                let scale = distance / prevDistance;
                let deltaY = -(scale - 1) * 1000;

                let zoomEvent = new CustomEvent("pinchZoom", {
                    bubbles: true,
                    detail: {
                        deltaY,
                        scale,
                        clientX: (touches[0].clientX + touches[1].clientX) / 2,
                        clientY: (touches[0].clientY + touches[1].clientY) / 2,
                        currentTarget: e.currentTarget,
                        originalEvent: e
                    }
                });

                el.dispatchEvent(zoomEvent);
            }

            prevDistance = distance;
            //lastCenter = center;
        };

        const onTouchEnd = () => {
            prevDistance = null;
        };

        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd);
        el.addEventListener("touchcancel", onTouchEnd);
    };

    addPinchZoomListener(container);

    /**
     * Event Listeners
     */

    // Handle pan logic
    container.addEventListener("dragInput", (e) => {
        if (e.detail.type === "move") {
            pan(e);
        }
    });

    // pinch zoom
    container.addEventListener("pinchZoom", (e) => {
        zoom(e.detail);
    });

    // Wheel zoom
    container.addEventListener(
        "wheel",
        (e) => {
            zoom(e);
        },
        { passive: false }
    );
}
