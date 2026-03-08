/* eslint-disable */
/**
 * SketchEngine - Main engine entry point
 *
 * Initializes the SVG canvas, sets up global state, imports all tool and shape modules,
 * and attaches event listeners. This is the single entry point for the sketch canvas.
 *
 * Usage:
 *   const engine = new SketchEngine(document.getElementById('freehand-canvas'));
 *   // later...
 *   engine.cleanup();
 */

class SketchEngine {
    constructor(svgElement, options = {}) {
        if (!svgElement || svgElement.tagName !== 'svg') {
            throw new Error('SketchEngine requires an SVG element');
        }

        this.svg = svgElement;
        this.options = {
            initialZoom: 1,
            minZoom: 0.4,
            maxZoom: 30,
            ...options
        };

        // Initialize global state on window for backward compatibility
        this._initGlobals();

        // Module references (populated after dynamic import)
        this._modules = {};
        this._initialized = false;
    }

    /**
     * Set up all the global variables that the tool/shape modules depend on.
     * These are set on `window` so existing code that references bare globals works.
     */
    _initGlobals() {
        // Core SVG reference
        window.svg = this.svg;

        // RoughJS instance
        if (window.rough) {
            window.roughCanvas = window.rough.svg(this.svg);
            window.roughGenerator = window.roughCanvas.generator;
        }

        // Shape storage
        if (!window.shapes) {
            window.shapes = [];
        }

        // Current shape being drawn/selected
        if (typeof window.currentShape === 'undefined') {
            window.currentShape = null;
        }

        // Mouse position tracking
        if (typeof window.lastMousePos === 'undefined') {
            window.lastMousePos = null;
        }

        // Zoom state
        window.currentZoom = this.options.initialZoom;
        window.minScale = this.options.minZoom;
        window.maxScale = this.options.maxZoom;
        window.minZoom = this.options.minZoom;
        window.maxZoom = this.options.maxZoom;

        // ViewBox state
        if (!window.currentViewBox) {
            window.currentViewBox = {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }

        // Tool activation flags
        window.isPaintToolActive = false;
        window.isTextToolActive = false;
        window.isCircleToolActive = false;
        window.isSquareToolActive = false;
        window.isLaserToolActive = false;
        window.isEraserToolActive = false;
        window.isImageToolActive = false;
        window.isArrowToolActive = false;
        window.isLineToolActive = false;
        window.isSelectionToolActive = false;
        window.isPanningToolActive = false;
        window.isFrameToolActive = false;
        window.isIconToolActive = false;
        window.isCodeToolActive = false;
        window.isTextInCodeMode = false;

        // Pan state
        window.isPanning = false;
        window.panStart = null;
        window.startCanvasX = 0;
        window.startCanvasY = 0;

        // Transform state
        window.currentMatrix = new DOMMatrix();
        window.currentTranslation = { x: 0, y: 0 };

        // Action type constants
        window.ACTION_CREATE = 'create';
        window.ACTION_DELETE = 'delete';
        window.ACTION_MODIFY = 'modify';
        window.ACTION_PASTE = 'paste';

        // History stacks (for eraser-style undo)
        if (!window.history) {
            window.history = [];
        }
        if (!window.redoStack) {
            window.redoStack = [];
        }
    }

    /**
     * Dynamically import all shape and tool modules.
     * Returns a promise that resolves when all modules are loaded.
     */
    async init() {
        if (this._initialized) return;

        try {
            // Import shape classes
            const [
                { Rectangle },
                { Circle },
                { Arrow },
                { Line },
                { TextShape },
                { CodeShape },
                { ImageShape },
                { IconShape },
                { Frame },
                { FreehandStroke }
            ] = await Promise.all([
                import('./shapes/Rectangle.js'),
                import('./shapes/Circle.js'),
                import('./shapes/Arrow.js'),
                import('./shapes/Line.js'),
                import('./shapes/TextShape.js'),
                import('./shapes/CodeShape.js'),
                import('./shapes/ImageShape.js'),
                import('./shapes/IconShape.js'),
                import('./shapes/Frame.js'),
                import('./shapes/FreehandStroke.js')
            ]);

            // Expose shape classes globally for backward compat
            window.Rectangle = Rectangle;
            window.Circle = Circle;
            window.Arrow = Arrow;
            window.Line = Line;
            window.TextShape = TextShape;
            window.CodeShape = CodeShape;
            window.ImageShape = ImageShape;
            window.IconShape = IconShape;
            window.Frame = Frame;
            window.FreehandStroke = FreehandStroke;

            this._modules.shapes = {
                Rectangle, Circle, Arrow, Line,
                TextShape, CodeShape, ImageShape, IconShape,
                Frame, FreehandStroke
            };

            // Import tool handlers
            const [
                rectangleTool,
                circleTool,
                arrowTool,
                lineTool,
                textTool,
                codeTool,
                imageTool,
                iconTool,
                frameTool,
                freehandTool
            ] = await Promise.all([
                import('./tools/rectangleTool.js'),
                import('./tools/circleTool.js'),
                import('./tools/arrowTool.js'),
                import('./tools/lineTool.js'),
                import('./tools/textTool.js'),
                import('./tools/codeTool.js'),
                import('./tools/imageTool.js'),
                import('./tools/iconTool.js'),
                import('./tools/frameTool.js'),
                import('./tools/freehandTool.js')
            ]);

            this._modules.tools = {
                rectangleTool, circleTool, arrowTool, lineTool,
                textTool, codeTool, imageTool, iconTool,
                frameTool, freehandTool
            };

            // Import core modules
            const [
                eventDispatcher,
                undoRedo,
                selection,
                zoomPan,
                copyPaste,
                eraserTrail,
                resizeShapes,
                resizeCode
            ] = await Promise.all([
                import('./core/EventDispatcher.js'),
                import('./core/UndoRedo.js'),
                import('./core/Selection.js'),
                import('./core/ZoomPan.js'),
                import('./core/CopyPaste.js'),
                import('./core/EraserTrail.js'),
                import('./core/ResizeShapes.js'),
                import('./core/ResizeCode.js')
            ]);

            this._modules.core = {
                eventDispatcher, undoRedo, selection,
                zoomPan, copyPaste, eraserTrail,
                resizeShapes, resizeCode
            };

            // Import standalone tools
            await Promise.all([
                import('./tools/eraserTool.js'),
                import('./tools/laserTool.js')
            ]);

            this._initialized = true;
            console.log('[SketchEngine] Initialized successfully');
        } catch (err) {
            console.error('[SketchEngine] Initialization failed:', err);
            throw err;
        }
    }

    /**
     * Get access to shape classes
     */
    get shapes() {
        return this._modules.shapes || {};
    }

    /**
     * Get access to tool handlers
     */
    get tools() {
        return this._modules.tools || {};
    }

    /**
     * Get access to core modules
     */
    get core() {
        return this._modules.core || {};
    }

    /**
     * Clean up event listeners and global state.
     * Call this when unmounting/destroying the sketch canvas.
     */
    cleanup() {
        // Remove event listeners that were attached to the SVG
        // Note: The individual modules attach their own listeners,
        // so a full cleanup would require each module to expose a cleanup method.
        // For now, we clear the global state.

        window.shapes = [];
        window.currentShape = null;
        window.lastMousePos = null;

        this._modules = {};
        this._initialized = false;

        console.log('[SketchEngine] Cleaned up');
    }
}

export { SketchEngine };
export default SketchEngine;
