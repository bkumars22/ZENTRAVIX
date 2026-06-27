from .devops_collector   import collect_devops
from .security_collector import collect_security
from .finance_collector  import collect_finance
from .product_collector  import collect_product

COLLECTORS = {
    "devops":    collect_devops,
    "security":  collect_security,
    "finance":   collect_finance,
    "product":   collect_product,
}
