export class WHIPProtocol {

    sendOffer(url: string, authKey: string | undefined, sdp: string): Promise<Response> {
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/sdp",
                "Authorization": authKey
            },
            body: sdp
        });
    }

    getConfiguration(url: string, authKey: string | undefined): Promise<Response> {
        return fetch(url, {
            method: "OPTIONS",
            headers: {
                "Authorization": authKey,
            }
        });
    }

    delete(url: string): Promise<Response> {
        return fetch(url, {
            method: "DELETE"
        });
    }

    updateIce(url: string, eTag: string, sdp: string): Promise<Response> {
        return fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/trickle-ice-sdpfrag",
                "ETag": eTag
            },
            body: sdp
        });
    }

}
