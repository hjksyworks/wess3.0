# wess-pilot 백엔드 빌드/실행 이미지
# 사용: docker compose build springboot-app (compose 빌드 컨텍스트: ./backend)

# 1단계: Maven 빌드 (Java 8)
FROM maven:3.8.8-eclipse-temurin-8 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline || true
COPY src ./src
RUN mvn -q -B package -DskipTests

# 2단계: 실행 전용 경량 이미지
FROM eclipse-temurin:8-jre
WORKDIR /app
COPY --from=build /build/target/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
