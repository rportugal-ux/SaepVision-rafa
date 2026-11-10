
document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formCadastro");
    const mensagem = document.getElementById("mensagemCadastro");

    if (!formulario) {
        console.error("Formulário não encontrado!");
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const tipo = document.getElementById("tipo").value;

        mensagem.textContent = "Enviando cadastro...";
        mensagem.style.color = "blue";

        try {
            const resposta = await fetch("/api/cadastro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome,
                    email,
                    senha,
                    tipo
                })
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(resultado.erro || "Erro no cadastro.");
            }

            mensagem.textContent = "Cadastro realizado com sucesso!";
            mensagem.style.color = "green";

            setTimeout(() => {
                window.location.href = "perfil.html";
            }, 1500);

        } catch (erro) {
            console.error(erro);
            mensagem.textContent = erro.message;
            mensagem.style.color = "red";
        }
    });
});
