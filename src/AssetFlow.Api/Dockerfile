FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY AssetFlow.Api.csproj .
RUN dotnet restore AssetFlow.Api.csproj
COPY . .
RUN dotnet publish AssetFlow.Api.csproj -c Release --no-restore -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "AssetFlow.Api.dll"]
