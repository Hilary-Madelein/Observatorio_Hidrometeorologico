const URL = 'http://localhost:3006/api';
export const URLBASE = "http://localhost:3006"; 

export const InicioSesion = async (data) => {
    const headers = {
        "Accept": 'application/json',
        "Content-Type": 'application/json'
    };
    const datos = await (await fetch(URL + "/sesion", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
        
    })).json();
    return datos;
}

export const ObtenerGet = async (key, url) => {
    const headers = {
        "Content-Type": "application/json",
        "X-API-TOKEN": key
    };
    const datos = await (await fetch(`${URL}/${url}`, {
        method: "GET",
        headers: headers,
    })).json();
    return datos;
}

export const ObtenerPost = async (key, url, bodyData) => {
    const headers = {
        "Content-Type": "application/json",
        "X-API-TOKEN": key
    };

    try {
        const response = await fetch(`${URL}/${url}`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(bodyData)
        });

        const text = await response.text();
        let datos;

        try {
            datos = JSON.parse(text);
        } catch (error) {
            throw new Error(`La respuesta no es un JSON válido: ${text}`);
        }
        return datos;

    } catch (error) {
        console.error("Error al realizar la solicitud POST:", error);
        throw error;
    }
}



export const Obtener = async (id, key, url) => {
    var cabeceras = { "X-API-TOKEN": key };
    const datos = await (await fetch(`${URL}${url}${id}`, {
        method: "GET",
        headers: cabeceras
    })).json();
    return datos;
} 

export const PostGuardar = async (data, key, urls) => {
    const headers = {
        "Content-Type": "application/json",
        "X-API-TOKEN": key
    };
    const datos = await (await fetch(`${URL}/${urls}`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
    })).json();
    return datos;
}

export const GuardarImages = async (data, key, urls) => {
    const headers = {
        "x-api-token": key,
    };
    const requestOptions = {
        method: "POST",
        headers: headers,
        body: data,
    };
    try {
        const response = await fetch(URL + urls, requestOptions);

        const datos = await response.json();

        return datos;
    } catch (error) {
        console.log("Error:", error);
        throw error;
    }
}