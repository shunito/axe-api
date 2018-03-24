FROM zenato/puppeteer

LABEL maintainer="shunsuke.ito@gmail.com" 

USER root

RUN apt-get update && apt-get install -y unzip

# CJK font
RUN mkdir /noto
ADD https://noto-website.storage.googleapis.com/pkgs/NotoSansCJKjp-hinted.zip /noto
WORKDIR /noto
RUN unzip NotoSansCJKjp-hinted.zip && \
    mkdir -p /usr/share/fonts/noto && \
    cp *.otf /usr/share/fonts/noto && \
    chmod 644 -R /usr/share/fonts/noto/ && \
    /usr/bin/fc-cache -fv
WORKDIR /
RUN rm -rf /noto

# App setting
RUN mkdir -p /app/static/screenshot

COPY ./app /app

WORKDIR /app
RUN npm install

# aXe Build locales
RUN npm install grunt-cli -g

WORKDIR /app/node_modules/axe-core
RUN npm install
RUN grunt build --all-lang
RUN rm -fr node_modules

RUN npm uninstall npm -g

WORKDIR /app

EXPOSE 3000

ENTRYPOINT ["node", "index.js"]
