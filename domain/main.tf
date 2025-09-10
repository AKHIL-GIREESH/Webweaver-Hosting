# main.tf

# Configure the AWS provider
provider "aws" {
  region = "ap-south-1" # Use your desired region
}

# Create a hosted zone for your domain
resource "aws_route53_zone" "main" {
  name = "webweaver.live" # Replace with your actual domain name
}

# Output the nameservers that AWS creates
output "nameservers" {
  value = aws_route53_zone.main.name_servers
}
