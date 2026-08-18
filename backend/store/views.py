import os
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Product, Order, OrderItem
from .serializers import ProductSerializer, OrderSerializer, OrderItemSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = []
        return [permission() for permission in permission_classes]

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate token for the new user
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        return Response({
            "user": serializer.data,
            "refresh": str(refresh),
            "access": str(access),
        }, status=status.HTTP_201_CREATED)

def generate_pdf_receipt(request, order_id):
    # Fetch the specific order and its associated items from MySQL
    try:
        order = Order.objects.get(id=order_id)
        if order.status == 'pending':
            order.status = 'confirmed'
            order.save() # This updates the MySQL database
            
        items = OrderItem.objects.filter(order=order)
    except Order.DoesNotExist:
        return HttpResponse("Order not found", status=404)

    # Path to your receipt template
    template_path = 'receipt_template.html'
    
    # Context data to be rendered in the HTML
    context = {
        'order': order,
        'items': items,
        'company_name': 'Grocerly Organic Market'
    }

    # Create a Django response object with PDF headers
    response = HttpResponse(content_type='application/pdf')
    
    # 'attachment' forces the browser to download the file instantly
    response['Content-Disposition'] = f'attachment; filename="Grocerly_Receipt_{order_id}.pdf"'

    # Find the template and render it with the context
    template = get_template(template_path)
    html = template.render(context)

    # Create the PDF
    pisa_status = pisa.CreatePDF(html, dest=response)

    # Return error if something went wrong during conversion
    if pisa_status.err:
       return HttpResponse('Error generating PDF', status=500)
       
    return response