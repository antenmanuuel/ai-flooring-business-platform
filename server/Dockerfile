# The Spring Boot server. Built with the Maven wrapper, run on a slim Java 25 runtime.
# Used by compose.yaml at the repo root; settings come from environment variables (see there).

FROM eclipse-temurin:25-jdk AS build
WORKDIR /build
COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src src
# The tests need MySQL, so they run in CI (and `npm test`) rather than here.
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp package -DskipTests && cp target/*.jar app.jar

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --uid 10001 flooring && mkdir uploads && chown flooring uploads
COPY --from=build /build/app.jar app.jar
USER flooring
# Uploaded photos live in /app/uploads; compose.yaml mounts a volume there so they survive rebuilds.
VOLUME /app/uploads
EXPOSE 5050
ENTRYPOINT ["java", "-jar", "app.jar"]
