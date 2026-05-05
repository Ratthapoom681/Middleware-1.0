from elasticsearch import Elasticsearch

from app.core.config import settings


es_client = Elasticsearch(settings.es_url, request_timeout=5)
