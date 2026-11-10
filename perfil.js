
document.addEventListener("DOMContentLoaded", () => {

    const nomeUsuario = document.getElementById("nomeUsuario");
    const emailUsuario = document.getElementById("emailUsuario");
    const tipoUsuario = document.getElementById("tipoUsuario");
    const avatarUsuario = document.getElementById("avatarUsuario");

    const quantidadePublicacoes =
        document.getElementById("quantidadePublicacoes");

    const areaPublicacao =
        document.getElementById("areaPublicacao");

    const formulario =
        document.getElementById("formPublicacao");

    const minhasFotos =
        document.getElementById("minhasFotos");

    const mensagem =
        document.getElementById("mensagemPublicacao");

    const botaoSair =
        document.getElementById("btnSair");

    let usuarioAtual = null;

    // CARREGAR DADOS DO USUÁRIO
    async function carregarPerfil() {

        try {

            const resposta = await fetch("/api/eu");
            const dados = await resposta.json();

            if (!dados.usuario) {

                window.location.href = "login.html";
                return;

            }

            usuarioAtual = dados.usuario;

            nomeUsuario.textContent = usuarioAtual.nome;
            emailUsuario.textContent = usuarioAtual.email;

            tipoUsuario.textContent =
                usuarioAtual.tipo === "fotografo"
                    ? "Fotógrafo"
                    : "Usuário comum";

            avatarUsuario.textContent =
                usuarioAtual.nome.charAt(0).toUpperCase();

            // Apenas fotógrafos podem publicar
            if (usuarioAtual.tipo !== "fotografo") {

                areaPublicacao.style.display = "none";

            } else {

                areaPublicacao.style.display = "block";

            }

            carregarPublicacoes();

        } catch (erro) {

            console.error(erro);

            nomeUsuario.textContent =
                "Erro ao carregar perfil.";

        }

    }

    // CARREGAR PUBLICAÇÕES DO USUÁRIO
    async function carregarPublicacoes() {

        try {

            const resposta = await fetch(
                `/api/usuarios/${usuarioAtual.id}`
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || "Erro ao carregar publicações."
                );
            }

            minhasFotos.innerHTML = "";

            const publicacoes = dados.publicacoes;

            quantidadePublicacoes.textContent =
                "Publicações: " + publicacoes.length;

            if (publicacoes.length === 0) {

                minhasFotos.innerHTML =
                    "<p>Você ainda não publicou fotografias.</p>";

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

                const local = document.createElement("p");
                local.textContent =
                    "Local: " + (foto.localizacao || "Não informado");

                const excluir = document.createElement("button");
                excluir.textContent = "Excluir publicação";
                excluir.className = "btn-excluir";

                excluir.addEventListener("click", () => {
                    excluirPublicacao(foto.id);
                });

                informacoes.appendChild(titulo);
                informacoes.appendChild(local);
                informacoes.appendChild(excluir);

                card.appendChild(imagem);
                card.appendChild(informacoes);

                minhasFotos.appendChild(card);

            });

        } catch (erro) {

            console.error(erro);

            minhasFotos.innerHTML =
                "<p>Não foi possível carregar suas fotografias.</p>";

        }

    }

    // PUBLICAR FOTOGRAFIA
    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const titulo = document.getElementById("tituloFoto").value.trim();

        const localizacao =
            document.getElementById("localFoto").value.trim();

        const imagem =
            document.getElementById("imagemFoto").files[0];

        if (!titulo || !imagem) {

            mensagem.textContent =
                "Informe o título e selecione uma imagem.";

            mensagem.style.color = "red";

            return;

        }

        const formatosPermitidos = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ];

        if (!formatosPermitidos.includes(imagem.type)) {

            mensagem.textContent =
                "Envie uma imagem JPG, JPEG, PNG, GIF ou WEBP.";

            mensagem.style.color = "red";

            return;

        }

        if (imagem.size > 5 * 1024 * 1024) {

            mensagem.textContent =
                "A imagem deve ter no máximo 5 MB.";

            mensagem.style.color = "red";

            return;

        }

        const dados = new FormData();

        dados.append("titulo", titulo);
        dados.append("localizacao", localizacao);
        dados.append("imagem", imagem);

        mensagem.textContent = "Publicando fotografia...";
        mensagem.style.color = "blue";

        try {

            const resposta = await fetch("/api/publicacoes", {

                method: "POST",
                body: dados

            });

            const resultado = await resposta.json();

            if (!resposta.ok) {

                throw new Error(
                    resultado.erro || "Erro ao publicar fotografia."
                );

            }

            mensagem.textContent =
                "Fotografia publicada com sucesso!";

            mensagem.style.color = "green";

            formulario.reset();

            await carregarPublicacoes();

        } catch (erro) {

            mensagem.textContent = erro.message;
            mensagem.style.color = "red";

        }

    });

    // EXCLUIR PUBLICAÇÃO
    async function excluirPublicacao(id) {

        const confirmar = confirm(
            "Deseja realmente excluir esta fotografia?"
        );

        if (!confirmar) return;

        try {

            const resposta = await fetch(
                `/api/publicacoes/${id}`,
                {
                    method: "DELETE"
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {

                throw new Error(
                    resultado.erro || "Erro ao excluir."
                );

            }

            alert("Publicação excluída com sucesso!");

            carregarPublicacoes();

        } catch (erro) {

            alert(erro.message);

        }

    }

    // SAIR DA CONTA
    botaoSair.addEventListener("click", async () => {

        try {

            await fetch("/api/logout", {
                method: "POST"
            });

            window.location.href = "index.html";

        } catch (erro) {

            alert("Não foi possível sair da conta.");

        }

    });

    carregarPerfil();

});
