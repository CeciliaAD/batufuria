const API_URL = "https://script.google.com/macros/s/AKfycbxoHs5DOsiny-80Jynradx68gQzhBqTTXUZKsEBeaGBHYIEkqoBrkrRga7AT0QUQN6S/exec";

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("lista-encuestas")) {
        cargarEncuestas();
    }
    if (document.getElementById("form-crear")) {
        configurarFormularioCrear();
        
        // Escuchadores para los botones de pestañas en crear.html
        document.getElementById("btn-tipo-ensayo").addEventListener("click", () => cambiarTipo('ensayo'));
        document.getElementById("btn-tipo-libre").addEventListener("click", () => cambiarTipo('libre'));
    }
});

async function cargarEncuestas() {
    const listaContenedor = document.getElementById("lista-encuestas");
    const loadingDiv = document.getElementById("loading");

    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();

        loadingDiv.classList.add("hidden");
        listaContenedor.classList.remove("hidden");

        if (datos.encuestas.length === 0) {
            listaContenedor.innerHTML = `<p class="text-center text-gray-500 py-4">No hay encuestas creadas todavía.</p>`;
            return;
        }

        listaContenedor.innerHTML = ""; 

        // ORDENACIÓN AUTOMÁTICA: Gira la lista para que las últimas creadas aparezcan arriba del todo
        const encuestasOrdenadas = [...datos.encuestas].reverse();

        encuestasOrdenadas.forEach(encuesta => {
            const estaActiva = encuesta.activa !== "NO";
            const votosEncuesta = datos.respuestas.filter(r => r.idEncuesta === encuesta.id);
            
            const tarjeta = document.createElement("div");
            tarjeta.className = `bg-white p-6 rounded-xl shadow-md border ${estaActiva ? 'border-gray-100' : 'border-gray-300 bg-gray-50 opacity-90'}`;
            
            let opcionesHTML = "";
            encuesta.opciones.forEach(opcion => {
                const nombreOpcion = opcion.trim();
                const votosDeEstaOpcion = votosEncuesta.filter(v => v.respuesta === nombreOpcion);
                const nombresVotantes = votosDeEstaOpcion.map(v => v.nombre).join(", ");

                opcionesHTML += `
                    <div class="my-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div class="flex items-center justify-between mb-1">
                            ${estaActiva ? `
                                <button onclick="votar('${encuesta.id}', '${nombreOpcion}')" 
                                        class="text-left font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer flex-1">
                                    🙋‍♂️ ${nombreOpcion}
                                </button>
                            ` : `
                                <span class="font-semibold text-gray-500">🚫 ${nombreOpcion}</span>
                            `}
                            <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                ${votosDeEstaOpcion.length}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 italic mt-1 pl-6">
                            ${nombresVotantes ? `Votan: ${nombresVotantes}` : 'Nadie ha votado esto aún'}
                        </p>
                    </div>
                `;
            });

            tarjeta.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-xl font-bold text-indigo-950">${encuesta.titulo}</h3>
                        <p class="text-gray-600 italic text-sm">"${encuesta.pregunta}"</p>
                    </div>
                    <span class="text-xs px-2 py-1 rounded font-bold ${estaActiva ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${estaActiva ? 'Abierta' : 'Cerrada'}
                    </span>
                </div>
                
                <div class="space-y-1 mt-4">${opcionesHTML}</div>
                
                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    ${estaActiva ? `
                        <button onclick="desactivarEncuesta('${encuesta.id}')" 
                                class="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer">
                            🔒 Cerrar votación
                        </button>
                    ` : '<span class="text-xs text-gray-400 italic">Votación finalizada</span>'}

                    <button onclick="mostrarGrafica('${encuesta.id}', ${JSON.stringify(encuesta.opciones)}, ${JSON.stringify(votosEncuesta)})" 
                            class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer">
                        📊 Ver Gráfico
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

async function votar(idEncuesta, respuestaElegida) {
    const nombreUsuario = prompt("Por favor, introduce tu nombre para registrar el voto:");
    if (!nombreUsuario || nombreUsuario.trim() === "") {
        alert("El nombre es obligatorio para saber quién viene.");
        return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accion: "votar",
                idEncuesta: idEncuesta,
                respuestaElegida: respuestaElegida,
                nombre: nombreUsuario.trim()
            })
        });

        alert("¡Voto registrado! La página se actualizará.");
        location.reload();
    } catch (error) {
        alert("Hubo un error al enviar tu voto.");
    }
}

async function desactivarEncuesta(idEncuesta) {
    if (!confirm("¿Quieres dar por terminada esta votación? Nadie más podrá votar.")) {
        return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accion: "desactivar",
                idEncuesta: idEncuesta
            })
        });

        alert("Encuesta cerrada con éxito.");
        location.reload();
    } catch (error) {
        alert("Error al cerrar la encuesta.");
    }
}

function mostrarGrafica(idEncuesta, opciones, votos) {
    const canvas = document.getElementById(`chart-${idEncuesta}`);
    if (!canvas.classList.contains("hidden")) { canvas.classList.add("hidden"); return; }
    canvas.classList.remove("hidden");
    const dataConteo = opciones.map(opcion => votos.filter(v => v.respuesta === opcion.trim()).length);
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
        options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    });
}

function configurarFormularioCrear() {
    const formulario = document.getElementById("form-crear");
    if(!formulario) return;
    const btnEnviar = document.getElementById("btn-enviar");
    const msgExito = document.getElementById("mensaje-exito");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();
        btnEnviar.disabled = true;
        btnEnviar.innerText = "Publicando...";
        const opcionesArray = document.getElementById("opciones").value.split(",").map(opt => opt.trim()).filter(opt => opt !== "");
        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accion: "crear",
                    titulo: document.getElementById("titulo").value,
                    pregunta: document.getElementById("pregunta").value,
                    opciones: opcionesArray
                })
            });
            msgExito.classList.remove("hidden");
            formulario.reset();
            setTimeout(() => { window.location.href = "index.html"; }, 2000);
        } catch (error) {
            alert("Error al crear la encuesta.");
            btnEnviar.disabled = false;
            btnEnviar.innerText = "Publicar Encuesta";
        }
    });
}

// LÓGICA DE PESTAÑAS: Reemplazo dinámico compatible con Tailwind v4 y tus instrumentos
function cambiarTipo(tipo) {
    const btnEnsayo = document.getElementById("btn-tipo-ensayo");
    const btnLibre = document.getElementById("btn-tipo-libre");
    const inputOpciones = document.getElementById("opciones");
    const ayudaOpciones = document.getElementById("ayuda-opciones");

    if (!btnEnsayo || !btnLibre || !inputOpciones) return;

    if (tipo === 'ensayo') {
        btnEnsayo.classList.replace("border-gray-200", "border-indigo-600");
        btnEnsayo.classList.replace("bg-white", "bg-indigo-50");
        btnEnsayo.classList.replace("text-gray-700", "text-indigo-900");
        btnEnsayo.classList.add("font-bold");

        btnLibre.classList.replace("border-indigo-600", "border-gray-200");
        btnLibre.classList.replace("bg-indigo-50", "bg-white");
        btnLibre.classList.replace("text-indigo-900", "text-gray-700");
        btnLibre.classList.remove("font-bold");
        
        inputOpciones.value = "Sí, soy caja, Sí soy repique, Sí soy dobra, Sí soy surdo 1, Sí soy surdo 2, No puedo ❌";
        inputOpciones.readOnly = true;
        inputOpciones.className = "w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed";
        if(ayudaOpciones) {
            ayudaOpciones.innerText = "Las opciones se han rellenado automáticamente para el ensayo.";
            ayudaOpciones.className = "text-xs text-gray-400 mt-1";
        }
    } else {
        btnLibre.classList.replace("border-gray-200", "border-indigo-600");
        btnLibre.classList.replace("bg-white", "bg-indigo-50");
        btnLibre.classList.replace("text-gray-700", "text-indigo-900");
        btnLibre.classList.add("font-bold");

        btnEnsayo.classList.replace("border-indigo-600", "border-gray-200");
        btnEnsayo.classList.replace("bg-indigo-50", "bg-white");
        btnEnsayo.classList.replace("text-indigo-900", "text-gray-700");
        btnEnsayo.classList.remove("font-bold");
        
        inputOpciones.value = "";
        inputOpciones.placeholder = "Opción 1, Opción 2, Opción 3 (separadas por comas)";
        inputOpciones.readOnly = false;
        inputOpciones.className = "w-full p-3 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:border-indigo-500";
        if(ayudaOpciones) {
            ayudaOpciones.innerText = "Escribe las opciones que quieras separadas por comas.";
            ayudaOpciones.className = "text-xs text-indigo-600 font-medium mt-1";
        }
    }
}