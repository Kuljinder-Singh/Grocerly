from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Product, Order, OrderItem


# -------------------------
# Product Serializer
# -------------------------
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'price',
            'stock_quantity', 'image', 'created_at', 'updated_at'
        ]


# -------------------------
# Order Item Serializer
# -------------------------
class OrderItemSerializer(serializers.ModelSerializer):
    # Show product details when reading
    product = ProductSerializer(read_only=True)
    # Allow product ID when creating/updating
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'product', 'product_id',
            'quantity', 'price', 'updated_at'
        ]
        read_only_fields = ['price']

    def validate(self, data):
        product = data['product']
        quantity = data['quantity']

        # ✅ Check stock before saving
        if product.stock_quantity < quantity:
            raise serializers.ValidationError(
                {"detail": f"Not enough stock available. Only {product.stock_quantity} left."}
            )
        return data

    def create(self, validated_data):
        product = validated_data['product']
        quantity = validated_data['quantity']

        # ✅ Calculate item price
        validated_data['price'] = product.price * quantity

        # # ✅ Decrease product stock
        # product.stock_quantity -= quantity
        # product.save()

        return super().create(validated_data)


# -------------------------
# Order Serializer
# -------------------------
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'status', 'total_amount',
            'updated_at', 'items'
        ]
        read_only_fields = ['user']


# -------------------------
# User Registration Serializer
# -------------------------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def validate_email(self, value):
        # ✅ Check valid email format
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Enter a valid email address.")

        # ✅ Ensure uniqueness
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already in use.")
        return value

    def validate_password(self, value):
        # ✅ Strong password rules
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )
        return user