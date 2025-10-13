export class WHIPProtocol {

    sendOffer(url: string, authKey: string | undefined, sdp: string): Promise<Response> {
        const headers = {
            "Content-Type": "application/sdp",
        };

        if (authKey) {
            headers['Authorization'] = `Bearer ${authKey}`;
        }

        return fetch(url, {
            method: "POST",
            headers,
            body: sdp
        });
    }

    getConfiguration(url: string, authKey: string | undefined): Promise<Response> {
        const headers = {};

        if (authKey) {
            headers['Authorization'] = `Bearer ${authKey}`;
        }

        return fetch(url, {
            method: "OPTIONS",
            headers
        });
    }

    delete(url: string, authKey: string | undefined): Promise<Response> {
        const headers = {};

        if (authKey) {
            headers['Authorization'] = `Bearer ${authKey}`;
        }

        return fetch(url, {
            method: "DELETE",
            headers
        });
    }

    updateIce(url: string, eTag: string, sdp: string, authKey: string | undefined): Promise<Response> {
        const headers = {
            "Content-Type": "application/trickle-ice-sdpfrag",
            "ETag": eTag,
        };

        if (authKey) {
            headers['Authorization'] = `Bearer ${authKey}`;
        }

        return fetch(url, {
            method: "PATCH",
            headers,
            body: sdp
        });
    }

}
