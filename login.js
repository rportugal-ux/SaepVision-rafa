
document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("formLogin");
    const mensagem = document.getElementById("mensagemLogin");

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        mensagem.textContent = "Verificando dados...";
        mensagem.style.color = "blue";

        try {

            const resposta = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    senha: senha
                })
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Usuário não encontrado ou senha incorreta"
                );
            }

            mensagem.textContent = "Login realizado com sucesso!";
            mensagem.style.color = "green";

            setTimeout(() => {
                window.location.href = "perfil.html";
            }, 1000);

        } catch (erro) {

            mensagem.textContent =
                erro.message ||
                "Usuário não encontrado ou senha incorreta";

            mensagem.style.color = "red";

        }

    });

});
