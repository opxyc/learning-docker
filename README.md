# learning-docker
Learning Docker

## Starting Docker
```sh
sudo systelctl start docker
docker version
docker info
```

## Running a container
```sh
docker container run --publish 80:80 --detach --name nginx_container nginx:alpine
docker container logs nginx_container
docker container stop nginx_container
docker container rm c1 c2 c3 --force
```

## Docker Internals
https://www.youtube.com/watch?v=sK5i-N34im8&list=PLBmVKD7o3L8v7Kl_XXh3KaJl9Qw2lyuFl

## Container is just a process
```sh
# listing the processes in the container
[be@fedora]$ docker container top nginx
UID        PID         PPID       C     STIME     TTY    TIME       CMD
root       64714       64693      0     18:11     ?      00:00:00   nginx: master process nginx -g daemon off;
101        64767       64714      0     18:11     ?      00:00:00   nginx: worker process
101        64768       64714      0     18:11     ?      00:00:00   nginx: worker process
101        64769       64714      0     18:11     ?      00:00:00   nginx: worker process
101        64770       64714      0     18:11     ?      00:00:00   nginx: worker process

# listing the processes in the host
[be@fedora]$ ps -ef | grep nginx
root       64714   64693          0     18:11     ?      00:00:00   nginx: master process nginx -g daemon off;
101        64767   64714          0     18:11     ?      00:00:00   nginx: worker process
101        64768   64714          0     18:11     ?      00:00:00   nginx: worker process
101        64769   64714          0     18:11     ?      00:00:00   nginx: worker process
101        64770   64714          0     18:11     ?      00:00:00   nginx: worker process
be         64813   63497          0     18:12     pts/1  00:00:00   grep --color=auto nginx

# stop the container
[be@fedora]$ docker container stop nginx

# check again
[be@fedora]$ ps -ef | grep nginx
be         65123   63497          0     18:18     pts/1  00:00:00   grep --color=auto nginx
```

## Checking what's going on inside a container
docker container top - process list in one container
docker container inspect - details of one container config
docker container stats - performance stats for all containers

## Getting a shell inside container
```sh
# at start time
docker container run -it image sh
# after statring
docker container exec -it contaienr sh
```

## Docker networks
See which ports are open on a container:
docker container port container

- Each container connected to a private virtual network "bridge"
- Each virtual network routes through NAT firewall on host IP
- All containers on a virtual network can talk to each other without -p
- Best practive is to create a ne virtual network for each app: Ex:

    - network "my_web_app" for mysql and php/apache containers
    - network "my_api" for mongo and nodejs containers

- We can attach one container to many networks
- Skip virtual networks and use host IP --net=host 

    Ex:

    ```sh
    docker container run -d --net=host nginx:alpine
    ```
    and then go to http://localhost and we will get nginx homepage; because nginx container is connected to the host network/ip.

- We can use different Docker network drivers to gain more abilities.

#### A sample usecase of how Docker networks work..

Suppose out host operating system is connected to a network (say ethernet) through Ethernet interface. There's a little firewall which blocks all incoming traffic from the network so that everything is blocked by default. Any traffic that's coming out from my containers is going to be NATed by default. It's acting like a pretty common edge firewall on a network.

![](./assets/docker-network-01.png)

There's this concept of the virtual networks, and by default, you'll see a network called bridge or docker0. When you start a new container, say nginx, that container is attached to that network and that virtual network is automatically attached to your Ethernet interface on your host so that it can get out. In our case, when we just launched that Nginx, we gave it a -p 80:80. Docker managed to open up port 80 on our Ethernet interface on our host and forward anything coming into port 80 through that virtual network to port 80 in that container. By default, when we create a second container, it's put on that same bridge network. Those two containers can talk freely back and forth on their exposed ports. Unless we specify the -p, no traffic coming into our internal networks is going to get to our containers. 

We can't have two containers listening on the port 80 at the host level. Only one can do that. If you try to start another container, it would actually error out and say that there's already something else on that port. That's not a Docker limitation; that's just a limitation of how IP networking typically works.


### Using the CLI
#### Show networks
`docker network ls`
```sh
[be@fedora]$ docker network ls
NETWORK ID     NAME      DRIVER    SCOPE
bb5def3f463d   bridge    bridge    local
bd329c0586ea   host      host      local
9ab44717d5ee   none      null      local

```
| network name | | |
| --- | --- | --- |
| bridge | Default Docker virtual network which is NATed behing the host IP | `--network bridge` |
| host | The network of host. It gains performance by skipping virtual networks but sactifices security of container model | `--network host` |
| none | Removes eth0 and only leaves us with localhost interface in container | `--network none` |

#### Inspect a network
`docker network inspect [network name | network id]`

#### Create a network
`docker network create --driver` - this spawns a new virtual network for us to attach containers to.
```sh
[be@fedora]$ docker network create my_app_net
c9e21eab7cc13bbc335ec9b73505569ffea5a8a6e76a86a54c72701ebb484ba6
[be@fedora]$ docker network ls
NETWORK ID     NAME         DRIVER    SCOPE
bb5def3f463d   bridge       bridge    local
bd329c0586ea   host         host      local
c9e21eab7cc1   my_app_net   bridge    local 👈 # the default driver is 'bridge'
9ab44717d5ee   none         null      local
```
We can specify more advanced options with the create command. Check out `docker netork create --help`.

While creating a new container, we can specify the network using the --network flag.
```
[be@fedora]$ docker run --name nginx -d --network my_app_net nginx:alpine
388af12d076a3586bc12845eb02df0cd649c3844bbd78a1810080fb595636f8a
[be@fedora]$ docker network inspect my_app_net | grep "Containers" -A 7
        "Containers": {
            "388af12d076a3586bc12845eb02df0cd649c3844bbd78a1810080fb595636f8a": {
                "Name": "nginx",
                "EndpointID": "f397b5b74d1dbb1167660cbfd0089170ac70d8caf2425102d2de7206b85396fd",
                "MacAddress": "02:42:ac:19:00:02",
                "IPv4Address": "172.25.0.2/16",
                "IPv6Address": ""
            }
[be@fedora]$ 
```

#### Add a container to a network
`docker network connect <network> <container>`
```
[be@fedora]$ docker run -d --name redis redis:alpine
e6c896a1755e9ec4e620418f5b3b4f70505fe9e6953dc425eb6e465303211f38
[be@fedora]$ docker network connect my_app_net redis
[be@fedora]$ docker network inspect my_app_net | grep "Containers" -A 14
        "Containers": {
            "388af12d076a3586bc12845eb02df0cd649c3844bbd78a1810080fb595636f8a": {
                "Name": "nginx",
                # ...
                "IPv4Address": "172.25.0.2/16",
                "IPv6Address": ""
            },
            "e6c896a1755e9ec4e620418f5b3b4f70505fe9e6953dc425eb6e465303211f38": {
                "Name": "redis",
                # ...
                "IPv4Address": "172.25.0.3/16",
                "IPv6Address": ""
            }
[be@fedora]$ 
```


#### Detach a container from a network
`docker network disconnect <network> <container>`

### DNS and How Containers find each other
DNS Basics:
- Comic Version https://howdns.works/

It's a bad idea to use staic ip addresses for internal communications; instead use hostnames. Docker deamon has an in-built DNS server that contains use by default and they use container names as an equivalent of hostnames for containers to talk to each other. 

Docker defaults the hostname to the container's name, but we can also get aliases.

```sh
[be@fedora]$ docker container run --network my_app_net -d --name nginx1 nginx:alpine]
[be@fedora]$ docker container run --network my_app_net -d --name nginx2 nginx:alpine]

# now if we inspect the network 'my_app_net', it will have to containers
# and as we mentioned, they will be automatically DNS resolved.

# ping the nginx2 from nginx1
[be@fedora]$ docker container exec -it nginx1 ping nginx2
PING nginx2 (172.25.0.3): 56 data bytes
64 bytes from 172.25.0.3: seq=0 ttl=64 time=0.110 ms
64 bytes from 172.25.0.3: seq=1 ttl=64 time=0.264 ms
^C
--- nginx2 ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max = 0.110/0.187/0.264 ms
# ping the nginx1 from nginx2
[be@fedora]$ docker container exec -it nginx2 ping nginx1
PING nginx1 (172.25.0.2): 56 data bytes
64 bytes from 172.25.0.2: seq=0 ttl=64 time=0.084 ms
64 bytes from 172.25.0.2: seq=1 ttl=64 time=0.265 ms
64 bytes from 172.25.0.2: seq=2 ttl=64 time=0.299 ms
^C
--- nginx1 ping statistics ---
3 packets transmitted, 3 packets received, 0% packet loss
round-trip min/avg/max = 0.084/0.216/0.299 ms
```

> So, the catch here is: containers can't really, or shouldn't really, rely on IP addresses for talking to each other because they just can't be relied on. And that DNS is really the standard here for how we do intercommunication between containers on the same host and across hosts.

### DNS Round Robin
DNS round robin ([wikipedia](./https://en.wikipedia.org/wiki/Round-robin_DNS)) is the concept that you can have two different hosts with DNS aliases that respond to the same DNS name. When you think about something like google[.]com obviously they've got more than one server. So, one of the techniques that big companies use to always make sure they're up 24/7 is to employ DNS round robin as part of their strategy so that there's actually multiple IP addresses in DNS records behind the name you're using on the Internet.

In Docker, we have a feature where if we create a custom network, we can actually assign an alias so that multiple containers can respond to the same DNS name.

Create a network (rrdns for ex):
```sh
[be@fedora]$ docker network create rrdns
f43c810dfb4b9690349b4cb90647d56a4621a6d461c0aa9694b3ca5cda642cf7
```

Spwan two containers connected to the network 'rrdns' with network alias 'search':
```sh
[be@fedora]$ docker container run -d --net rrdns --net-alias search redis:alpine
31832ddbdf03b91f8556456d8d02cc30566620fa956472b050a2a1b1abe3dce0
[be@fedora]$ docker container run -d --net rrdns --net-alias search redis:alpine
71007c23295c657cf8bc96d9fa6cfe41264dea31de8be72a818bcf2d210cc08b
```

Now, try nsloopup on the the hostname 'search':

```
[be@fedora]$ docker container run --net rrdns alpine nslookup search
Server:         127.0.0.11
Address:        127.0.0.11:53

Non-authoritative answer:
*** Can't find search: No answer

Non-authoritative answer:
Name:   search
Address: 172.26.0.3 👈
Name:   search
Address: 172.26.0.2 👈
```
See that we get two hosts with same name. ✌️

Inspecting the network:

```
[be@fedora]$ docker network inspect rrdns
[
    {
        "Name": "rrdns",
        ...
        "Containers": {
            "31832ddbdf03b91f8556456d8d02cc30566620fa956472b050a2a1b1abe3dce0": {
                ...
                "IPv4Address": "172.26.0.2/16", 👈
                "IPv6Address": ""
            },
            "71007c23295c657cf8bc96d9fa6cfe41264dea31de8be72a818bcf2d210cc08b": {
                ...
                "IPv4Address": "172.26.0.3/16", 👈
                "IPv6Address": ""
            }
        },
        ...
    }
]
[be@fedora]$ 
```

## Images
A must read on how Docker handles images and what happens when a container is started - https://docs.docker.com/storage/storagedriver/

-- dockerfile
-- builing it

## Persisting Data - Volumes
As an example, let's see how mysql image handles it's data:
Current volumes (as we can see is empty):
```sh
[be@fedora]$ docker volume ls
DRIVER    VOLUME NAME 
```
Start mysql container and list the volumes created by Docker:
```
[be@fedora]$ docker container run -d --name mysql -e MYSQL_ALLOW_EMPTY_PASWORD+True mysql
2445aaefc34d5386568b2f315e6b942468ef88d4b206ebdf798e8448fbe66004
[be@fedora]$ docker volume ls
DRIVER    VOLUME NAME
local     b7aac1f90c38dceed3b61a2efdea8a4dc30a4c979eb6dd4068aa0827924ea044 👈
```
Let's inspect the running container and see more details:
```sh
[be@fedora]$ docker container inspect mysql
[
    {
        "Id": "2445aaefc34d5386568b2f315e6b942468ef88d4b206ebdf798e8448fbe66004",
        ...
        "Mounts": [
            {
                "Type": "volume",
                "Name": "b7aac1f90c38dceed3b61a2efdea8a4dc30a4c979eb6dd4068aa0827924ea044", 
                # on the host machine, inside this location, docker is storing the files for the 'mysql' container
                "Source": "/var/lib/docker/volumes/b7aac1f90c38dceed3b61a2efdea8a4dc30a4c979eb6dd4068aa0827924ea044/_data", 👈
                # and is mapped to '/var/lib/mysql' directory inside the container
                "Destination": "/var/lib/mysql",
                ...
            }
        ],
    }
]
```

#### The problem
1. Whenever we create a new container (what requires a volume - specifies in it's Dockerfile), it will create a fresh new volume.

    If the container we are running is a database, for example, when ever we start a container, it will therefore be a fresh instance which doesn't have any data that was stored before, if applicable. To tackle this issue, we can use **names volumes**.

2. volumes outlive the containers.

    We are removing the mysql container and listing the volumes again:
    ```sh
    [be@fedora volumes]$ docker container rm mysql -f
    mysql
    [be@fedora volumes]$ docker volume ls
    DRIVER    VOLUME NAME
    local     b7aac1f90c38dceed3b61a2efdea8a4dc30a4c979eb6dd4068aa0827924ea044
    ```

### Named Volumes
We can specify a name to the volume:
```
                                                                             👇
docker container run -d --name mysql -e MYSQL_ALLOW_EMPTY_PASWORD+True -v mysql-db:/var/lib/mysql mysql
```
No if we check the volumes:
```sh
[be@fedora ~]$ docker volume ls
DRIVER    VOLUME NAME
local     mysql-db 👈
```
The advantage is, next time when we run the the container again, we can specify the same volume name and due to the point 2 (in the problems we mentioned), the volumes are preserved by Docker, therefore the data that we generated previously in the this volume, will be present.

## Bind Mounting
Here we mount a host file/directory to a container file/directory. This skips UFS and host files overwrite any container files. 
- Cannot use in Dockerfile, must be used with `container run` command:

`run -v /path/in/host:/path/in/container`

#### How does docker differentiate a names volume and bind mount?
Bind mounts start with a `/` 🤭

Ex: serving an html page with nginx:

Create a very simple html file named index.html and save anywhere else. I am putting it in `/tmp/docker-nginx`
```html
<!DOCTYPE html>
<h1>Hei There</h1>
```
Now, bring up nginx container with it's `/usr/share/nginx/html` mounted to `/tmp/docker-nginx`. (Where did this /usr/*/html path come from? That's the default document root of nginx. Refer https://hub.docker.com/_/nginx).

```sh
# create the html file
[be@fedora ~]$ mkdir /tmp/docker-nginx && echo '<!DOCTYPE html><h1>Hei There</h1>' > /tmp/docker-nginx/index.html
# bring up the container
[be@fedora ~]$ docker container run -d -p 80:80 -v /tmp/docker-nginx:/usr/share/nginx/html nginx:alpine
db9c7502d0e2a33c1ee70f28f29d5c9bfd8857860a5c5a14e6f6374c19885cd3
# test the response
[be@fedora ~]$ curl localhost
<!DOCTYPE html><h1>Hei There</h1>
```
We can see that the container is bind mounted to the host machine's volume.

# Docker Compose
TODO: Copy from other tutorial

# Swarm
Some of the problems that arises while using lots of containers for applications include:
- How do we automate container lifecycle?
- How do we easily scale out/in/up/down?
- How do we ensure our containers are re-created if they fail?
- How do we replace containers without downtime(blue/green deploy)?
- How do we control/track where containers get started?
- How do we create cross-node virtual networks?
- How do we ensure only trusted servers run our containers?
- How do we store secrets, keys, passwords and get them to the right container(and only that container)?
These are the major problems that Swarm tries to solve. **Swarm Mode is a clustering solution built inside Docker that helps in orchestration of conainer lifecycle.


There are two types of notes - Manager and Worker - in a swarm. 
- Mangers have a database locally on them known as the Raft Database that is replicated again amongst all the nodes. It stores the configurations and gives them all the information they need to have to be the authority inside a swarm.  They  all keep a copy of that database and encrypt their traffic in order to ensure integrity and guarantee  the trust that they're able to manage this swarm securely. 

![](https://docs.docker.com/engine/swarm/images/swarm-diagram.png)

The managers themselves can also be workers. Of course, we can demote and promote workers and  managers into the two different roles. When you think of a manager, typically think of a worker with permissions to control the swarm.

Let's take an example to understand better(eventhough not everything).

We know that the `docker run` command can deploy (only) one container and it does it on on whatever machine the Docker CLI was talking to which usually is our local machine, or maybe a server we are logged into. That Docker run command didn't have concepts around how to scale out or scale up. So we needed new commands to deal with that. That's where swarm and docker service comes in.

A Sarm allows us to add extra features to our container when we run it, such as replicas to tell us how many of those it wants to run. Those are known as **tasks**. A single **service** can have multiple tasks, and each one of those tasks will launch a container. 

![](https://docs.docker.com/engine/swarm/images/services-diagram.png)

In this example, we've created a service using docker service create to spin up an Nginx service using the Nginx image like we've done several times before. But we've told it that we'd like three replicas. So it will use the manager nodes to decide where in the swarm to place those. By default, it tries to spread them out. Each node would get its own copy of the Nginx container up to the three replicas that we told it we needed.

### How docker service work
Given below is the architecture of docker swarm mode. There is a Swarm API that has a bunch of background services - scheduler, dispatcher, allocator and orchestrator, that help make decisions around what the workers should be executing at any given moment. 

![](https://docs.docker.com/engine/swarm/images/service-lifecycle.png)

So the workers are constantly reporting in to the managers and asking for new work. The managers are constantly doling out new work and evaluating what you've told them to do against what they're actually doing. Then if there's any reconciliation to happen, they will make those changes, such as maybe you told it to spin up three more replicate tasks in that service. So the orchestrator will realize that and then issue orders down to the workers and so on.

Check if swarm is enabled or not:
```sh
[be@fedora ~]$ docker info | grep -i swarm
 Swarm: inactive
```

Activate swarm:
```sh
docker swarm init
```
```
[be@fedora ~]$ docker swarm init
Swarm initialized: current node (9rl10j8covggiwt5lfherdhh4) is now a manager.

To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-5itvz3umfgegpsxj0g5p100q5aeyxqtrvvrjo66vz42xv0mt41-9gryafxqgjegbngqilhoi70d0 192.168.221.49:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```
This will do the following:
- Lots of PKI and security automation:

    - Root Signing Certificate created for our Sarm
    - Certificate is issued for the first Manager Node
    - Created tokens what can be use on other nodes to join this swarm.
- Raft database created to store root CA, configs and secrets

    - Encrypted by default on disk
    - No need for another key/value system to hold orchestration/secrets
    - Replicates logs amongst Managers via mutual TLS in "control plane"

```sh
[be@fedora ~]$ docker node ls
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
9rl10j8covggiwt5lfherdhh4 *   fedora     Ready     Active         Leader           20.10.8
```
There are only be one Leader among the managers.

## Docker Service
### Create a new service
Service can have many tasks where each task will usually be a container.
```
[be@fedora ~]$ docker service create alpine ping 8.8.8.8
q1ht76ko8o18a257yes6zj45j
overall progress: 1 out of 1 tasks 
1/1: running   
verify: Service converged 
```

Verifying the same:
```sh
[be@fedora ~]$ docker service ls
ID             NAME             MODE         REPLICAS   IMAGE           PORTS
q1ht76ko8o18   friendly_wiles   replicated   1/1        alpine:latest   
[be@fedora ~]$ docker service ps friendly_wiles
ID             NAME               IMAGE           NODE      DESIRED STATE   CURRENT STATE            ERROR     PORTS
wije77s9abjx   friendly_wiles.1   alpine:latest   fedora    Running         Running 34 seconds ago             

# Container created by 'service' is visible via 'docker container' command as well.
[be@fedora ~]$ docker container ls
CONTAINER ID   IMAGE           COMMAND          CREATED          STATUS          PORTS     NAMES
db39afabf109   alpine:latest   "ping 8.8.8.8"   46 seconds ago   Up 43 seconds             friendly_wiles.1.wije77s9abjx4iaqo18gfqrl1
```

### Scaling the service
```sh
[be@fedora ~]$ docker service update q1ht76ko8o18 --replicas 3
q1ht76ko8o18
overall progress: 3 out of 3 tasks 
1/3: running   
2/3: running   
3/3: running   
verify: Service converged 
```
```sh
[be@fedora ~]$ docker service ls
ID             NAME             MODE         REPLICAS   IMAGE           PORTS
q1ht76ko8o18   friendly_wiles   replicated   3/3        alpine:latest   
[be@fedora ~]$ docker service ps q1ht76ko8o18
ID             NAME               IMAGE           NODE      DESIRED STATE   CURRENT STATE             
wije77s9abjx   friendly_wiles.1   alpine:latest   fedora    Running         Running 6 minutes ago                  
qx92don5pln0   friendly_wiles.2   alpine:latest   fedora    Running         Running about a minute ago             
djd0jh4zqf72   friendly_wiles.3   alpine:latest   fedora    Running         Running about a minute ago             
```

Let's try abruptly killing a task:
```sh            
# list all the running containers
[be@fedora ~]$ docker ps
CONTAINER ID   IMAGE           COMMAND          CREATED       STATUS       PORTS     NAMES
a7901ba7ffcc   alpine:latest   "ping 8.8.8.8"   4 hours ago   Up 4 hours             friendly_wiles.3.djd0jh4zqf72e4f4nyy1lh9vv
938a369eddb3   alpine:latest   "ping 8.8.8.8"   4 hours ago   Up 4 hours             friendly_wiles.2.qx92don5pln0p8dk67op4nx0d
db39afabf109   alpine:latest   "ping 8.8.8.8"   4 hours ago   Up 4 hours             friendly_wiles.1.wije77s9abjx4iaqo18gfqrl1
# remove the second container in the cluster forfecully
[be@fedora ~]$ docker rm -f friendly_wiles.2.qx92don5pln0p8dk67op4nx0d
friendly_wiles.2.qx92don5pln0p8dk67op4nx0d
# now when we check the service ps, we can see that a new task has started.
# swarm will boot up a new container if any of the existing containers in the cluster failed.
[be@fedora ~]$ docker service ps q1ht76ko8o18
ID             NAME                   IMAGE           NODE      DESIRED STATE   CURRENT STATE                  ERROR                         PORTS
wije77s9abjx   friendly_wiles.1       alpine:latest   fedora    Running         Running 4 hours ago                                          
wxkgh06arjej   friendly_wiles.2       alpine:latest   fedora    Ready           Ready less than a second ago                                 
qx92don5pln0    \_ friendly_wiles.2   alpine:latest   fedora    Shutdown        Failed 1 second ago            "task: non-zero exit (137)"   
djd0jh4zqf72   friendly_wiles.3       alpine:latest   fedora    Running         Running 4 hours ago                                          
[be@fedora ~]$ docker service ps q1ht76ko8o18
ID             NAME                   IMAGE           NODE      DESIRED STATE   CURRENT STATE          ERROR                         PORTS
wije77s9abjx   friendly_wiles.1       alpine:latest   fedora    Running         Running 4 hours ago                                  
wxkgh06arjej   friendly_wiles.2       alpine:latest   fedora    Running         Running 1 second ago                                 
qx92don5pln0    \_ friendly_wiles.2   alpine:latest   fedora    Shutdown        Failed 8 seconds ago   "task: non-zero exit (137)"   
djd0jh4zqf72   friendly_wiles.3       alpine:latest   fedora    Running         Running 4 hours ago                                  
```

### Bringing down a service
```
docker service rm <serviceName>
```
```
[be@fedora ~]$ docker service rm friendly_wiles
```

## Exercise: Creating a 3-Node Swarm Cluster
Node1

```sh
docker swarm init [--advertise-addr <address to expose>]
# join the swarm on second node
docker swarm join --token <token> <ip:port>
# on master:
docker node ls
docker node update --role manager node2
docker swarm join-token manager
docker service create --replicas 3 alpine ping 8.8.8.8
docker service ls
docker sercive ps serviceName
docker node ps nodeHostName
```

> If you are getting an error `Unavailable desc = connection error: desc = "transport: Error while dialing dial tcp 192.168.103.215:2377: connect: no route to host"` while tring to connect to a swarm, try running `firewall-cmd --add-port=2377/tcp --permanent && firewall-cmd --reload` on the master node.


## Overlay Multi-Host Networking
- Choose `--driver overlay` when creating network
- This is only for container-to-container traffic inside a single swarm
- Optional IPSec(AES) encryption on network creation which sets up IPSec tonnels between all nodes in the swarm.
- Each service can be connected to multiple networks

```sh
docker network create --driver overlay myswarmnet
docker service create --name psql --network myswarmnet -e POSTGRES_PASSWORD=mypass postgres:alpine
docker service create --name web --network myswarmnet -p 80:80 nginx:alpine
```
```
[u@vm01 ~]$ docker service ls
ID             NAME      MODE         REPLICAS   IMAGE             PORTS
nwy7viidnp7n   psql      replicated   1/1        postgres:alpine   
tmiz4ydl3v57   web       replicated   1/1        nginx:alpine      *:80->80/tcp
[u@vm01 ~]$ 
```
If we try to access the nginx service on port 80 on both the ip addresses, it will be available. How? Here comes the Routing Mesh

### Routing Mesh
- Routes ingress (incoming) packets for a Service to proper Task
- Spans all nodes in Swarm
- Uses IPVs from Linux Kernel
- Load balances Swarm Services accross their Tasks
- Two ways this works:

    1. Contaner-to-container in a Overlay network(uses VIP)
    2. External traffic incoming to publishes ports in the service (all node listen)

<br/>
- This is stateless load balancing
- This LB is at OSI Layer 3(TCP), not layer 4(DNS)

    If you've ever run multiple websites on the same port, on the same server, this isn't going to do that yet. You're still going to need another piece of the puzzle on top of that if you're actually wanting to run multiple websites on the same port, on the same swarm. 

Solution to the above problems:
- One of them is to use Nginx or HAProxy, which there are pretty good examples out there of containers that will sit in front with your routing mesh, and actually act as a stateful load balancer or a layer for load balancer, that can also do caching and lots of other things. 
- Docker Enterprise edition comes with a built-in layer for web proxy that allows you to just throw DNS names in the web config of your swarm services and everything just works.

## Stacks
It's a new layer of abstraction to Swarm. Stacks accept Compose files as their declarative definition for service, networks and volumes. We use `docker stack deploy` rather than `docker service create`.

Stacks manages all those objects for us, including overlay networks per stack.

Compose Vs Swarm compose file major syntax difference:
| Compose | Swarm | 
| --- | --- |
| `build` (compose ignores deploy keyword) | `deploy` (swarm ignores build keyword) |

TODO: include yml

```sh
docker stack deploy -c some-stack.yml name
docker stack ls
docker stack services name # gives services
docker stack ps name # gives tasks
```

## Secrets Storage
- Secrets are first stored in Swarm(in control on Managers using the Raft DB), then assigned to Service(s)
- Only containers in assigned Service(s) can see them
- They look like files in container but are actually in-memory fs available in `/run/secrets/<secret_name>` or `/run/secrets/<secret_alias>`

### File as secret
```sh
docker secret create <name> <file>
```
```sh
[u@vm01 ~]$ cat secret.txt 
luciferMorningstar
[u@vm01 ~]$ docker secret create username secret.txt
w7nmg31jky0cuf21wwxo4869b
```

### Key as secret
```sh
echo "value" | docker secret create <name> -
```
```sh
[u@vm01 ~]$ echo "luciferMorningstar" | docker secret create password -
y7srm9bbulyl9htq4ggoa04kb
```

### Using secrets
```sh
docker service create --name psql \
    --secret username \
    --secret password \
    -e POSTGRES_PASSWORD_FILE=/run/secrets/password \
    -e POSTGRES_USER_FILE=/run/secrets/username postgres:alpine
```

### Using Secrets with Swarm Stacks
```yml
version: "3.1"
services:
    psql:
        image: postgres:alpine
        secrets:
            - username
            - password
        environment:
            - POSTGRES_PASSWORD_FILE=/run/secrets/password
            - POSTGRES_USER_FILE=/run/secrets/username
    
secrets:
    username:
        file: ./username.txt
    password:
        file: ./password.txt
```

```sh
[u@vm01 docker]$ docker stack deploy -c docker-compose.yml mydb
Creating service mydb_psql
[u@vm01 docker]$ docker service ls
ID             NAME        MODE         REPLICAS   IMAGE             PORTS
mqg7hpde2lya   mydb_psql   replicated   0/1        postgres:alpine   
```

Note: Secrets will also work with normal compose (not in swarm). Docker does this by bind mounting files to /run/secrets/ directory (which is insecure and a simple workaround). Also, this will only work with file based secrets.


```sh
[be@fedora Desktop]$ cat username.txt password.txt 
username
P@ssword@134
# make sure we are not in a swarm
[be@fedora Desktop]$ docker service ls
Error response from daemon: This node is not a swarm manager. Use "docker swarm init" or "docker swarm join" to connect this node to swarm and try again.
# use compose / with secrets
[be@fedora Desktop]$ docker-compose up -d
Creating desktop_psql_1 ... done
# --
[be@fedora Desktop]$ docker ps
CONTAINER ID   IMAGE             COMMAND                  CREATED         STATUS         PORTS      NAMES
2204b5915566   postgres:alpine   "docker-entrypoint.s…"   6 minutes ago   Up 6 minutes   5432/tcp   desktop_psql_1
[be@fedora Desktop]$ docker exec desktop_psql_1 cat /run/secrets/username
username
```