until nc -z db 5432; do
  echo "Esperando a Postgres..."
  sleep 1
done

echo "Inicializando tablas en Postgres y Cosmos…"
curl -s http://localhost:3006/privado/${KEY_SQ}

exec "$@"
