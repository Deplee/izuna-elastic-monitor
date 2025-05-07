#!/bin/bash

DOCKER_COMPOSE_CMD=""

check_docker_compose_version() {
    echo "Проверка версии Docker Compose..."

    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version --short)
        echo "Найден Docker Compose v2: $COMPOSE_VERSION"
        DOCKER_COMPOSE_CMD="docker compose"
        return 0
    fi

    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose version --short)
        echo "Найден Docker Compose v1: $COMPOSE_VERSION"
        DOCKER_COMPOSE_CMD="docker-compose"
        return 0
    fi

    echo "Ошибка: Docker Compose не найден в системе."
    return 1
}

check_docker_compose_version

if [ -n "$DOCKER_COMPOSE_CMD" ]; then
    echo "Starting build stage."
    eval "$DOCKER_COMPOSE_CMD build"
    if [ $? -eq 0 ]; then
        echo "Build stage done."
        echo "Now run "$DOCKER_COMPOSE_CMD up -d""
        echo "And visit http://your_ip:8080"
        echo "Thanks <3"
    else
        echo "Ошибка при выполнении команды."
    fi
else
    echo "Не удалось определить команду Docker Compose."
    exit 1
fi