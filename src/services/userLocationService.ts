declare global {
    interface Window {
        naver: any;
    }
}

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
    return new Promise((resolve) => {
        if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
            resolve("위치 정보 없음"); // SDK not ready
            return;
        }

        const coord = new window.naver.maps.LatLng(lat, lng);

        window.naver.maps.Service.reverseGeocode({
            coords: coord,
            orders: [
                window.naver.maps.Service.OrderType.ADDR,
                window.naver.maps.Service.OrderType.ROAD_ADDR
            ].join(',')
        }, (status: any, response: any) => {
            if (status === window.naver.maps.Service.Status.OK) {
                const result = response.v2; // v2 API response
                if (result && result.results && result.results.length > 0) {
                    // Prefer ADDR (Jibun) or ROAD_ADDR
                    const item = result.results[0];
                    const region = item.region;

                    // region structure: area1 (City), area2 (Gu), area3 (Dong)
                    const gu = region.area2.name;
                    const dong = region.area3.name;

                    resolve(`${gu} ${dong}`);
                } else {
                    resolve("주소 확인 불가");
                }
            } else {
                console.error("Geocode Error:", status);
                resolve("위치 확인 불가");
            }
        });
    });
}
