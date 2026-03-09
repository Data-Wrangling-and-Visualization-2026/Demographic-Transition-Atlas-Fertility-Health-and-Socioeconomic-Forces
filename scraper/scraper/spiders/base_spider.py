import scrapy
import logging

logger = logging.getLogger(__name__)


class BaseSpider(scrapy.Spider):
    name = "base_spider"
    allowed_domains = []
    start_urls = ['https://example.com']  # ЭТО ВАЖНО! должен быть URL

    def parse(self, response):
        logger.info(f"Парсинг: {response.url}")
        print("=" * 50)
        print("ПАУК РАБОТАЕТ!")
        print("=" * 50)

        yield {
            'title': response.css('title::text').get(),
            'url': response.url
        }