from django.db import models
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField()
    image = models.ImageField( upload_to='products/', blank=True, null=True,)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('pending','Pending'),
        ('confirmed','Confirmed'),
        ('shipped','Shipped'),
        ('delivered','Delivered'),
        ('cancelled','Cancelled'),
    ], default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)
    
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        
        # check stock before saving
        if self.quantity > self.product.stock_quantity:
            raise ValidationError("Not enough stock for the product.")
       
        # calculate item price before saving
        self.price = self.product.price * self.quantity
        super().save(*args, **kwargs)
        
        # Recalculate order total after saving an item
        self.order.total_amount = sum(item.price for item in self.order.items.all())
        self.order.save()
        
        # Decrease product stock quantity
        self.product.stock_quantity -= self.quantity
        self.product.save()
    
    @property
    def get_total_item_price(self):
        """This allows the receipt to see the total for this line item."""
        return self.price  # Your save method already stores (qty * unit_price) here