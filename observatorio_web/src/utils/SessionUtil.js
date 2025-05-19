export const borrarSesion = () => {
    localStorage.clear();
}

export const saveToken = (token) => {
    localStorage.setItem("token", token);
}

export const getToken = () => {
    return localStorage.getItem('token');
}

//------------------ROLES------------------
export const saveRoles = (role) => {
    const rolesJSON = JSON.stringify(role);
    localStorage.setItem('role', rolesJSON);
};

export const getRoles = () => {
    const rolesJSON = localStorage.getItem('role');
    return rolesJSON ? JSON.parse(rolesJSON) : null;
};

export const borrarRoles = () => {
    localStorage.removeItem('role');
};

export const estaSesion = () => {
    var token = localStorage.getItem('token');
    return (token && (token !== 'undefined' || token !== null || token !== 'null'));
}

//USUARIO
// Guardar usuario en el almacenamiento local
export const saveUser = (user) => {
    const userJSON = JSON.stringify(user);
    localStorage.setItem('user', userJSON);
}

// Obtener usuario desde el almacenamiento local
export const getUser = () => {
    const userJSON = localStorage.getItem('user');
    if (userJSON) {
        try {
            return JSON.parse(userJSON);
        } catch (e) {
            console.error('Error al analizar los datos del usuario:', e);
            return null;
        }
    }
    return null;
};

//CORREO
export const saveCorreo = (correo) => {
    localStorage.setItem("correo", correo);
}

export const getCorreo = () => {
    return localStorage.getItem('correo');
}







