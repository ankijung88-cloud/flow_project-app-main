export { };

declare global {
    interface Window {
        naver: any;
    }
}

declare namespace naver.maps {
    class Map {
        constructor(element: string | HTMLElement, options?: MapOptions);
        setCenter(center: LatLng | LatLngLiteral): void;
        setZoom(level: number, useEffect?: boolean): void;
        fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral, options?: any): void;
        panTo(coord: LatLng | LatLngLiteral, options?: any): void;
        morph(coord: LatLng | LatLngLiteral, zoom?: number, options?: any): void;
        getCenter(): LatLng;
        getZoom(): number;
        setSize(size: Size | SizeLiteral): void;
        destroy(): void;
        addListener(eventName: string, listener: (e: any) => void): MapEventListener;
    }

    interface MapOptions {
        center: LatLng | LatLngLiteral;
        zoom?: number;
        minZoom?: number;
        maxZoom?: number;
        zoomControl?: boolean;
        zoomControlOptions?: any;
        mapTypeControl?: boolean;
        scaleControl?: boolean;
        logoControl?: boolean;
        logoControlOptions?: any;
        mapDataControl?: boolean;
        disableDoubleClickZoom?: boolean;
        draggable?: boolean;
        scrollWheel?: boolean;
        disableKineticPan?: boolean;
        tileTransition?: boolean;
        background?: string;
        overlayZoomEffect?: string;
        tileSpare?: number;
    }

    class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
    }

    interface LatLngLiteral {
        lat: number;
        lng: number;
    }

    class LatLngBounds {
        constructor(sw: LatLng | LatLngLiteral, ne: LatLng | LatLngLiteral);
        extend(coord: LatLng | LatLngLiteral): LatLngBounds;
    }

    interface LatLngBoundsLiteral {
        south: number;
        west: number;
        north: number;
        east: number;
    }

    class Size {
        constructor(width: number, height: number);
    }

    interface SizeLiteral {
        width: number;
        height: number;
    }

    class Marker {
        constructor(options: MarkerOptions);
        setMap(map: Map | null): void;
        setPosition(position: LatLng | LatLngLiteral): void;
        setIcon(icon: string | ImageIcon | SymbolIcon | HtmlIcon): void;
        getMap(): Map | null;
        getPosition(): LatLng;
        setZIndex(zIndex: number): void;
        getIcon(): any;
    }

    interface MarkerOptions {
        position: LatLng | LatLngLiteral;
        map?: Map;
        icon?: string | ImageIcon | SymbolIcon | HtmlIcon;
        title?: string;
        cursor?: string;
        clickable?: boolean;
        draggable?: boolean;
        visible?: boolean;
        zIndex?: number;
    }

    interface HtmlIcon {
        content: string | HTMLElement;
        size?: Size | SizeLiteral;
        anchor?: Point | PointLiteral;
    }

    interface ImageIcon {
        url: string;
        size?: Size | SizeLiteral;
        scaledSize?: Size | SizeLiteral;
        origin?: Point | PointLiteral;
        anchor?: Point | PointLiteral;
    }

    interface SymbolIcon {
        path: SymbolPath | Point[] | PointLiteral[];
        style?: string;
        radius?: number;
        fillColor?: string;
        fillOpacity?: number;
        strokeColor?: string;
        strokeWeight?: number;
        strokeOpacity?: number;
        anchor?: Point | PointLiteral;
    }

    type SymbolPath =
        | 'BACKWARD_CLOSED_ARROW'
        | 'BACKWARD_OPEN_ARROW'
        | 'CIRCLE'
        | 'FORWARD_CLOSED_ARROW'
        | 'FORWARD_OPEN_ARROW'
        | 'STAR'
        | 'X';

    class Polyline {
        constructor(options: PolylineOptions);
        setMap(map: Map | null): void;
        setPath(path: Array<LatLng | LatLngLiteral>): void;
        getPath(): any; // Mobile-optimized path collection
    }

    interface PolylineOptions {
        map?: Map;
        path: Array<LatLng | LatLngLiteral>;
        strokeColor?: string;
        strokeWeight?: number;
        strokeOpacity?: number;
        strokeStyle?: string; // 'solid', 'shortdash', 'shortdot', 'shortdashdot', 'shortdashdotdot', 'dot', 'dash', 'longdash', 'dashdot', 'longdashdot', 'longdashdotdot'
        lineCap?: string; // 'butt', 'round', 'square'
        lineJoin?: string; // 'miter', 'round', 'bevel'
        clickable?: boolean;
        visible?: boolean;
        zIndex?: number;
    }

    class Circle {
        constructor(options: CircleOptions);
        setMap(map: Map | null): void;
        setCenter(center: LatLng | LatLngLiteral): void;
        setRadius(radius: number): void;
        setOptions(options: CircleOptions): void;
    }

    interface CircleOptions {
        map?: Map;
        center: LatLng | LatLngLiteral;
        radius: number;
        strokeColor?: string;
        strokeWeight?: number;
        strokeOpacity?: number;
        fillColor?: string;
        fillOpacity?: number;
        clickable?: boolean;
        visible?: boolean;
        zIndex?: number;
    }

    class Event {
        static addListener(instance: any, eventName: string, handler: (e: any) => void): any;
        static removeListener(listener: any): void;
    }

    interface MapEventListener {
        // opaque handle
    }

    interface Point {
        x: number;
        y: number;
    }

    interface PointLiteral {
        x: number;
        y: number;
    }

    namespace Service {
        function fromAddrToCoord(options: any, callback: any): void;
        // Add other service methods as needed
    }
}
