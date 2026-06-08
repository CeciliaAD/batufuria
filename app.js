// CONFIGURACIÓN: Reemplaza esto con la URL que te dio Google Apps Script al implementar
const API_URL = "https://script.google.com/macros/s/AKfycbxCeo3wB_nE1lwk7uQms-XJuTcQrknuN7fENiIYJw0GTHbK6JFUD_ViM9srirSK9VUF/exec";

// Detectar en qué página estamos para ejecutar una lógica u otra
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("lista-encuestas")) {
        // Estamos en la página de inicio (index.html)
        cargarEncuestas();
    }
    if (document.getElementById("form-crear")) {
        // Estamos en la página de creación (crear.html)
        configurarFormularioCrear();
    }
});

// ==========================================
// LÓGICA DE LA PÁGINA PRINCIPAL (INDEX.HTML)
// ==========================================

async function cargarEncuestas() {
    const listaContenedor = document.getElementById("lista-encuestas");
    const loadingDiv = document.getElementById("loading");

    try {
        // Hacemos la petición GET a nuestra API de Google
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();

        loadingDiv.classList.add("hidden");
        listaContenedor.classList.remove("hidden");

        if (datos.encuestas.length === 0) {
            listaContenedor.innerHTML = `<p class="text-center text-gray-500 py-4">No hay encuestas creadas todavía. ¡Sé la primera en crear una!</p>`;
            return;
        }

        // Procesar cada encuesta
        datos.encuestas.forEach(encuesta => {
            // Contamos los votos de esta encuesta concreta
            const votosEncuesta = datos.respuestas.filter(r => r.idEncuesta === encuesta.id);
            
            // Creamos la tarjeta de la encuesta en HTML
            const tarjeta = document.createElement("div");
            tarjeta.className = "bg-white p-6 rounded-xl shadow-md border border-gray-100";
            
            let opcionesHTML = "";
            encuesta.opciones.forEach(opcion => {
                const nombreOpcion = opcion.trim();
                // Contamos cuántos votos tiene esta opción específica
                const numVotos = votosEncuesta.filter(v => v.respuesta === nombreOpcion).length;

                opcionesHTML += `
                    <div class="flex items-center justify-between my-2 p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 transition">
                        <button onclick="votar('${encuesta.id}', '${nombreOpcion}')" 
                                class="text-left font-medium text-gray-700 hover:text-indigo-600 flex-1 cursor-pointer">
                            🙋‍♂️ ${nombreOpcion}
                        </button>
                        <span class="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            ${numVotos} ${numVotos === 1 ? 'voto' : 'votos'}
                        </span>
                    </div>
                `;
            });

            tarjeta.innerHTML = `
                <h3 class="text-xl font-bold text-indigo-950 mb-1">${encuesta.titulo}</h3>
                <p class="text-gray-600 mb-4 italic">"${encuesta.pregunta}"</p>
                <div class="space-y-1">${opcionesHTML}</div>
                
                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <button onclick="mostrarGrafica('${encuesta.id}', ${JSON.stringify(encuesta.opciones)}, ${JSON.stringify(votosEncuesta)})" 
                            class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer">
                        📊 Ver Gráfico Estadístico
                    </button>
                </div>
                <canvas id="chart-${encuesta.id}" class="mt-4 hidden max-h-48"></canvas>
            `;

            listaContenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al cargar datos:", error);
        loadingDiv.innerHTML = "❌ Error al conectar con la base de datos de la batucada.";
    }
}

// Función para enviar un voto
async function votar(idEncuesta, respuestaElegida) {
    if (!confirm(`¿Quieres registrar tu voto para "${respuestaElegida}"?`)) return;

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", // Evita problemas de CORS con Google Apps Script
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accion: "votar",
                idEncuesta: idEncuesta,
                respuestaElegida: respuestaElegida
            })
        });

        alert("¡Voto enviado con éxito! La página se recargará para actualizar los resultados.");
        location.reload();
    } catch (error) {
        alert("Hubo un error al enviar tu voto.");
        console.error(error);
    }
}

// Función para pintar la gráfica con Chart.js
function mostrarGrafica(idEncuesta, opciones, votos) {
    const canvas = document.getElementById(`chart-${idEncuesta}`);
    
    // Si ya está visible, lo ocultamos (toggle)
    if (!canvas.classList.contains("hidden")) {
        canvas.classList.add("hidden");
        return;
    }
    
    canvas.classList.remove("hidden");

    // Preparar los datos contados para la gráfica
    const dataConteo = opciones.map(opcion => {
        return votos.filter(v => v.respuesta === opcion.trim()).length;
    });

    // Crear el gráfico de barras horizontales
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: opciones,
            datasets: [{
                label: 'Votos',
                data: dataConteo,
                backgroundColor: 'rgba(79, 70, 229, 0.6)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y', // Hace que las barras sean horizontales
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}


// =============================================
// LÓGICA DE LA PÁGINA DE CREACIÓN (CREAR.HTML)
// =============================================

function configurarFormularioCrear() {
    const formulario = document.getElementById("form-crear");
    const btnEnviar = document.getElementById("btn-enviar");
    const msgExito = document.getElementById("mensaje-exito");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        btnEnviar.disabled = true;
        btnEnviar.innerText = "Publicando...";

        // Procesamos las opciones separadas por comas en un array limpio
        const opcionesArray = document.getElementById("opciones").value
            .split(",")
            .map(opt => opt.trim())
            .filter(opt => opt !== ""); // Quita espacios vacíos

        const datosNuevaEncuesta = {
            accion: "crear",
            titulo: document.getElementById("titulo").value,
            pregunta: document.getElementById("pregunta").value,
            opciones: opcionesArray
        };

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosNuevaEncuesta)
            });

            // Como usamos 'no-cors' no podemos leer la respuesta JSON directamente,
            // pero si no salta al catch es que se ha enviado correctamente.
            msgExito.classList.remove("hidden");
            formulario.reset();

            // Redirigir al inicio tras 2 segundos
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);

        } catch (error) {
            alert("Error al crear la encuesta.");
            console.error(error);
            btnEnviar.disabled = false;
            btnEnviar.innerText = "Publicar Encuesta";
        }
    });
}