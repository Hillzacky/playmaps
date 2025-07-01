FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    ROOT_PASSWORD=root

RUN apt-get update && apt-get install -y \
    curl gnupg ca-certificates \
    openssh-server \
    sudo unzip wget xz-utils \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /var/run/sshd && \
    echo "root:${ROOT_PASSWORD}" | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY app .
RUN npm install -g npm@latest
RUN npm run build

EXPOSE 22 80 443 3000
CMD bash -c "/usr/sbin/sshd & npm run start"

