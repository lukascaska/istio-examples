Esse repositório contém exemplos práticos de possíveis utilizações do Istio como service mesh no kubernetes, grande parte dos exemplos foram retirados do site oficial, [Istio](https://istio.io), e foram adaptados para uso com duas aplicações hipotéticas, um front em React e um backend em NodeJS.

Para deixar o ambiente pronto você precisa de:
1. Um nó de kubernetes (nesse exemplo utilizei o minikube, mas pode ser feito com qualquer emulador ou k8s gerenciado).
2. Istio na versão 1.8 disponível no site oficial, para instalar a versão utilizada nesse repositório execute.
    1. ./bin/istioctl install --set profile=default
3. Caso use algum emulador de k8s (Ex: Minikube), veja quais os passos para expor os IP's para a rede local do seu computador.
    1. No caso do minikube basta executar *minikube tunnel*


Com o nó de k8s pronto e a instalação do Istio funcionando vamos começar a instalar as aplicações.

Na raiz desse repositório execute:
```sh
// habilite o sidecar do Istio em todas as aplicações do namespace default
kubectl label namespace default istio-injection=enabled 
kubectl apply -f kubernetes/deployments/istio-front.yaml
kubectl apply -f kubernetes/deployments/istio-server-v1.yaml
```

Com esses dois comandos vamos ter o frontend usado por todos os testes e a primeira versão do backend.

```sh
Caso queira ver se tudo deu certo
kubectl get pods 
```

Com tudo pronto podemos habilitar o primeiro uso do istio na nossa stack, como ingress para nossas aplicações.
Execute o comando abaixo para descobrir o IP utilizado pela ingress padrão do Istio no seu nó de kubernetes.
```
Pegue o valor da coluna external-ip!
kubectl get svc -n istio-system istio-ingressgateway
```

Após pegar esse IP, caso você esteja usando um nó local de kubernetes, adicione a seguinte linha no seu /etc/hosts substituido EXTERNAL-IP pelo ip encontrado anteriormente:

```sh
EXTERNAL-IP example-ingress.com
```

Caso você esteja usando um nó de kubernetes gerenciado provavelmente esse Ip será criado sozinho, nesse caso basta trocar os valores em todos os exemplos.


Com o IP mapeado podemos testar no browser o hostname http://example-ingress.com, e não teremos nenhuma resposta, isso porque não configuramos nada.

Para expor nossa aplicação vamos precisar de dois objetos kubernetes:

1. Gateway padrão para ambas as aplicações
2. Virtual-Services, uma para cada aplicação (front e backend)

Para expor o front seguimos com:

```sh
kubectl apply -f kubernetes/istio/gateway.yaml
kubectl apply -f kubernetes/istio/front-virtual-service.yaml
```

Acesse agora o mesmo endereço, http://example-ingress.com, e veja o frontend.


Agora vamos para o backend, que possui outro virtual-service.
```sh
kubectl apply -f kubernetes/istio/just-ingress-traffic/virtual-service.yaml
```

Visite o arquivo e perceba as diferenças entre o virtual service do frontend e do backend, que estão baseadas principalmente no path utilizado para expor a aplicação.
Os dois arquivos poderiam ser um só, (kubernetes/istio/single-file-front-back.yaml), mas para deixar mais claro os exemplos ficamos com os arquivos separados.


Agora visite o frontend novamente e aperte o botão para verificar a conexão com o server, se tudo ocorreu bem até aqui teremos uma mensagem de sucesso.


Vamos agora para o próximo passo, que é o roteamento baseado em critérios como headers.

Aplique o seguinte arquivo, que vai sobreescrever o virtual service do backend anterior:

```sh
kubectl apply -f kubernetes/istio/just-header-match-traffic/virtual-service.yaml
```

Tente novamente fazer uma requisição do frontend para o server e você receberá um erro de Server unrecheable, isso porque deixamos configurado o virtual service para que a aplicação seja acessada somente quando o header x-circle-id tenha o valor teste, então adicione a palavra *teste* no campo de input do frontend e faça novamente a requisição e você terá a conexão com sucesso. Veja no arquivo que o campo match usa dois parâmetros, url prefix e match headers, e nesse caso somente se os dois critérios forem supridos a conexão terá o fim desejado.

Com a mesma lógica podemos fazer um teste de duas versões da mesma aplicação sendo acessadas somente quando quisermos, para isso vamos adicionar um novo objeto kubernetes, destination-rules, que possibilita o mapeamento das nossas aplicações de forma mais poderosa, baseada em labels de versão por exemplo.

Execute os seguintes comandos para testar.

```sh
kubectl apply -f kubernetes/deployments/istio-server-v2.yaml
kubectl apply -f kubernetes/istio/split-traffic/destination-rules.yaml
kubectl apply -f kubernetes/istio/split-traffic/virtual-service.yaml
```

Após os comandos você terá duas versões do backend no seu cluster e as configurações de roteamente seguindo a seguinte lógica.

```sh
if (headers["x-circle-id"] == "v1") {
    return "aplicação v1"
} else if (headers["x-circle-id"] == "v2") {
    return "aplicação v2"
} else {
    return "aplicação v2"
}
```

Perceba no arquivo de virtual service que temos como ultimo elemento (temos três elementos dentro de spec.http) um match somente por uri.prefix, sem a presença do match por header, isso se dá pq queremos uma versão padrão para os usuários que não tenham o header x-circle-id configurado, seria o nosso caso default. Então qualquer valor no input do frontend que não seja v1 irá retornar a versão dois do server, experimente e compare os virtual services deste exemplo com os anteriores.

Após verificar tudo podemos partir para o próximo exemplo, que tem a ver com a parte de segurança das nossas aplicações. Sem alterar o código de nenhuma aplicação é possível adicionar validação de um token JWT, e para isso vamos adicionar dois novos objetos, RequestPolicy e AuthorizationPolicy.

```sh
kubectl apply -f kubernetes/istio/jwt-auth/jwt-all-paths.yaml

```

Veja os arquivos e note que no primeiro objeto especificamos a aplicação que queremos proteger (com as matchLabels) e qual issuers vamos utilizar, nesse caso usamos uma de exemplo do próprio Istio, mas poderiamos ter um keycloak da mesma forma. No segundo objeto, que é obrigatório para fazer valer a proteção, temos as regras, que nesse caso do exemplo aplica para todas as possíveis fontes de uma requisição, *importante lembrar das matchLabels*.

Depois de aplicado tente novamente fazer uma requisição no frontend e provavelmente você terá uma mensagem de Access Denied, habilite o token e a requisição ocorrerá normalmente.

Podemos configurar também caminhos abertos que não necessitam do JTW, aplique o seguinte arquivo:

```sh
kubectl apply -f kubernetes/istio/jwt-auth/jwt.yaml
```

Perceba que nesse arquivo temos regras diferentes no final, uma regra a mais que adiciona o caminho "/" para a lista de paths liberados, após aplicar desabilite o token no frontend e veja a requisição retornar com sucesso.

Preview Métricas

1. Instale Prometheus
```sh
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.8/samples/addons/prometheus.yaml
```

2. Para acessar o prometheus utilize:
```sh
kubectl port-forward -n istio-system svc/prometheus 9090
no browser digite http://localhost:9090
```

3. Veja os acessos de cada aplicação com a seguinte query:
    - sum by (app) ({\_\_name\_\_=\~"istio_requests_total", response_code=\~"304|200"})

4. Instale o grafana
    - kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.8/samples/addons/grafana.yaml
    


WIP!

- Adicionar camada de métricas e logs mais completas.
- Mutual TLS
- Mais opções do destination-rules (sticky sessions, traffic policy, etc.)










