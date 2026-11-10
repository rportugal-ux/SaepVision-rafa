
document.addEventListener("DOMContentLoaded", () => {

    const galeria = document.getElementById("galeriaFotos");
    const campoPesquisa = document.getElementById("pesquisaFotografo");
    const botaoPesquisar = document.getElementById("btnPesquisar");
    const mensagemPesquisa = document.getElementById("mensagemPesquisa");

    // CARREGAR FOTOGRAFIAS
    async function carregarPublicacoes(busca = "") {

        if (!galeria) return;

        galeria.innerHTML = "<p>Carregando fotografias...</p>";

        try {
            const resposta = await fetch(
                `/api/publicacoes?busca=${encodeURIComponent(busca)}`
            );

            const publicacoes = await resposta.json();

            if (!resposta.ok) {
                throw new Error(publicacoes.erro || "Erro ao carregar.");
            }

            galeria.innerHTML = "";

            if (publicacoes.length === 0) {
                galeria.innerHTML =
                    "<p>Nenhuma fotografia encontrada.</p>";
                return;
            }

            publicacoes.forEach((foto) => {

                const card = document.createElement("article");
                card.className = "foto-card";

                const imagem = document.createElement("img");
                imagem.src = foto.imagem;
                imagem.alt = foto.titulo;
                imagem.onerror = () => {
                    imagem.alt = "Imagem indisponível";
                };

                const informacoes = document.createElement("div");
                informacoes.className = "info";

                const titulo = document.createElement("h3");
                titulo.textContent = foto.titulo;

                const fotografo = document.createElement("p");
                fotografo.textContent = "Fotógrafo: " + foto.fotografo;

                const local = document.createElement("p");
                local.textContent = "Local: " +
                    (foto.localizacao || "Não informado");

                const botaoCurtir = document.createElement("button");
                botaoCurtir.className = "btn-curtir";

                const jaCurtiu = Number(foto.curtiu) > 0;

                botaoCurtir.classList.toggle("curtiu", jaCurtiu);

                botaoCurtir.textContent =
                    (jaCurtiu ? "❤️ " : "♡ ") +
                    foto.curtidas + " curtidas";

                botaoCurtir.addEventListener("click", async () => {
                    await curtirPublicacao(foto.id);
                });

                informacoes.appendChild(titulo);
                informacoes.appendChild(fotografo);
                informacoes.appendChild(local);
                informacoes.appendChild(botaoCurtir);

                card.appendChild(imagem);
                card.appendChild(informacoes);

                galeria.appendChild(card);
            });

        } catch (erro) {
            console.error(erro);
            galeria.innerHTML =
                "<p>Não foi possível carregar as fotografias.</p>";
        }
    }

    // PESQUISAR FOTÓGRAFOS
    async function pesquisarFotografo() {

        const nome = campoPesquisa.value.trim();

        mensagemPesquisa.textContent = "";

        if (nome === "") {
            carregarPublicacoes();
            return;
        }

        try {
            const resposta = await fetch(
                `/api/publicacoes?busca=${encodeURIComponent(nome)}`
            );

            const publicacoes = await resposta.json();

            if (!resposta.ok) {
                throw new Error("Erro na pesquisa.");
            }

            if (publicacoes.length === 0) {
                mensagemPesquisa.textContent =
                    "Fotógrafo não encontrado.";
            } else {
                mensagemPesquisa.textContent =
                    "Resultados encontrados: " + publicacoes.length;
            }

            mostrarPublicacoes(publicacoes);

        } catch (erro) {
            console.error(erro);
            mensagemPesquisa.textContent =
                "Não foi possível realizar a pesquisa.";
        }
    }

    // MOSTRAR RESULTADOS DA PESQUISA
    function mostrarPublicacoes(publicacoes) {

        galeria.innerHTML = "";

        if (publicacoes.length === 0) {
            galeria.innerHTML =
                "<p>Nenhuma fotografia encontrada.</p>";
            return;
        }

        publicacoes.forEach((foto) => {

            const card = document.createElement("article");
            card.className = "foto-card";

            const imagem = document.createElement("img");
            imagem.src = foto.imagem;
            imagem.alt = foto.titulo;

            const informacoes = document.createElement("div");
            informacoes.className = "info";

            const titulo = document.createElement("h3");
            titulo.textContent = foto.titulo;

            const fotografo = document.createElement("p");
            fotografo.textContent = "Fotógrafo: " + foto.fotografo;

            const botao = document.createElement("button");
            botao.className = "btn-curtir";

            const jaCurtiu = Number(foto.curtiu) > 0;

            botao.classList.toggle("curtiu", jaCurtiu);
            botao.textContent =
                (jaCurtiu ? "❤️ " : "♡ ") +
                foto.curtidas + " curtidas";

            botao.addEventListener("click", () => {
                curtirPublicacao(foto.id);
            });

            informacoes.appendChild(titulo);
            informacoes.appendChild(fotografo);
            informacoes.appendChild(botao);

            card.appendChild(imagem);
            card.appendChild(informacoes);

            galeria.appendChild(card);
        });
    }

    // CURTIR OU DESCURTIR
    async function curtirPublicacao(id) {

        try {
            const resposta = await fetch(
                `/api/publicacoes/${id}/curtir`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                alert(resultado.erro || "Faça login para curtir.");
                return;
            }

            carregarPublicacoes(campoPesquisa.value.trim());

        } catch (erro) {
            console.error(erro);
            alert("Não foi possível registrar sua curtida.");
        }
    }

    // EVENTO DO BOTÃO DE PESQUISA
    if (botaoPesquisar) {
        botaoPesquisar.addEventListener("click", pesquisarFotografo);
    }

    // PESQUISAR AO APERTAR ENTER
    if (campoPesquisa) {
        campoPesquisa.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter") {
                pesquisarFotografo();
            }
        });
    }

    // CARREGAR A GALERIA AO ABRIR A PÁGINA
    carregarPublicacoes();

});
